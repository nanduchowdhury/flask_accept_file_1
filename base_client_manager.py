import json
import threading
import uuid
from flask import session, jsonify, current_app, request
import redis
from redis.exceptions import LockError
from redis.lock import Lock

redis_client = redis.StrictRedis(host='localhost', port=6379)

class BaseClientManager:
    def __init__(self, eManager):

        self.eManager = eManager

        self.data = {}
        self.lock = Lock(redis_client, 'session_lock', timeout=60)

        # Constants
        self.SERVER_SHARED_FILE = "/home/nandu_chowdhury/kupamanduk/scholar/server_logs/shared_file.json"
        self.REDIS = 'redis'
        self.FSYSTEM = 'fsystem'
        self.USE_DATABASE = self.FSYSTEM

    def dump_session(self, uuid):
        if not self.lock.acquire(blocking=True):
            return None

        try:
            self._force_read_session()
            print(json.dumps(self.data[uuid], indent=4))

        finally:
            self.lock.release()

    ########################################################
    # Following 2 APIs can be used if Redis database is used 
    # share data among workers.
    # Make sure to run following in a terminal:
    #           redis-server
    # You can also run following from another terminal:
    #           redis-cli
    # Following commands can be used to inspect the database:
    #                KEYS *
    #                FLUSHALL
    #                GET <key>
    ########################################################
    def _force_read_session_redis(self):
        session_interface = current_app.session_interface

        if not request:
            raise RuntimeError("Request context is required to read the session.")

        session_obj = session_interface.open_session(current_app, request)
        session.update(session_obj or {})

        self.data = session.get('data', {})

    def _force_save_session_redis(self):

        session['data'] = self.data
        session.modified = True
        response = current_app.response_class()  # Dummy response object
        current_app.session_interface.save_session(current_app, session, response)

    def _force_read_session_fsystem(self):
        try:
            with open(self.SERVER_SHARED_FILE, 'r') as f:
                self.data = json.load(f)
        except FileNotFoundError:
            self.data = {}
        except Exception as e:
            raise ValueError(self.eManager.show_message(1051, self.SERVER_SHARED_FILE, str(e)))

    def _force_save_session_fsystem(self):
        try:
            with open(self.SERVER_SHARED_FILE, 'w') as f:
                json.dump(self.data, f, indent=4)
        except Exception as e:
            raise ValueError(self.eManager.show_message(1052, self.SERVER_SHARED_FILE, str(e)))
    
    def _force_read_session(self):
        
        if self.USE_DATABASE == self.REDIS:
            self._force_read_session_redis()
        elif self.USE_DATABASE == self.FSYSTEM:
            self._force_read_session_fsystem()

    def _force_save_session(self):
        
        if self.USE_DATABASE == self.REDIS:
            self._force_save_session_redis()
        elif self.USE_DATABASE == self.FSYSTEM:
            self._force_save_session_fsystem()

    def _set_uuid(self, cuuid):
        if cuuid not in self.data:
            self.data[cuuid] = {}

    def _clear_uuid(self, uuid):
        if uuid in self.data:
            del self.data[uuid]

    def clear_client_uuid(self, cuuid):
        if not self.lock.acquire(blocking=True):
            return None

        try:
            self._force_read_session()
            self._clear_uuid(cuuid)
            self._force_save_session()

        finally:
            self.lock.release()

    def set_client_uuid(self, cuuid=None):
        if not self.lock.acquire(blocking=True):
            return None

        try:
            if cuuid is None:
                cuuid = str(uuid.uuid4())  # Generate a new UUID if none is provided

            self._set_uuid(cuuid)
            return cuuid

        finally:
            self.lock.release()

    def _clear_key(self, uuid, key):
        if uuid in self.data:
            if key in self.data[uuid]:
                # Remove the 'key' and all its data
                del self.data[uuid][key]

    def _set_key(self, cuuid, key, value):
        if cuuid not in self.data:
            self.data[cuuid] = {}

        keys = key.split('.')
        current_data = self.data[cuuid]
        for k in keys[:-1]:
            current_data = current_data.setdefault(k, {})  # Traverse or create nested dicts
        current_data[keys[-1]] = value

    def _get_key(self, cuuid, key):
        if cuuid not in self.data:
            raise ValueError(f"UUID '{cuuid}' not found.")

        keys = key.split('.')
        current_data = self.data[cuuid]

        try:
            for k in keys:
                current_data = current_data[k]
            return current_data
        except Exception as e:
            raise ValueError(self.eManager.show_message(1053, key, str(e)))

    def clear_client_data(self, cuuid, key):
        if not self.lock.acquire(blocking=True):
            return

        try:
            self._force_read_session()
            self._clear_key(cuuid, key)
            self._force_save_session()

        finally:
            self.lock.release()

    def save_client_data(self, cuuid, key, value):
        if not self.lock.acquire(blocking=True):
            return

        try:
            self._force_read_session()  # Load existing data from session

            # Ensure that the UUID exists in self.data
            if cuuid not in self.data:
                self.data[cuuid] = {}

            # Update the key with the new value, preserving existing data
            self._set_key(cuuid, key, value)

            # Save the updated data back to the session
            self._force_save_session()

        except Exception as e:
            # Log any exceptions
            print(f"Error in saving client data for UUID {cuuid}: {str(e)}")
            raise

        finally:
            self.lock.release()

    def get_client_data(self, cuuid, key):

        if not self.lock.acquire(blocking=True):
            return None

        try:
            self._force_read_session()  # Refresh data from session

            # Step 3: Try to get the key from the session-loaded data
            try:
                value = self._get_key(cuuid, key)
                return value  # Return value if found after session read
            except KeyError:
                raise ValueError(f"Key '{key}' not found in the session data.")

        finally:
            self.lock.release()

