import json
import threading
import uuid
from flask import session, jsonify, current_app, request
import redis
from redis.exceptions import LockError

redis_client = redis.StrictRedis(host='localhost', port=6379)
lock = redis_client.lock('session_lock', timeout=10)

class BaseClientManager:
    def __init__(self):

        self.data = {}

    def dump_session(self, uuid):
        if not self._acquire_lock():
            return None

        try:
            self._force_read_session()
            print(json.dumps(self.data[uuid], indent=4))

        finally:
            self._release_lock()

    def _force_read_session(self):
        session_interface = current_app.session_interface

        if not request:
            raise RuntimeError("Request context is required to read the session.")

        session_obj = session_interface.open_session(current_app, request)
        session.update(session_obj or {})

        self.data = session.get('data', {})

    def _force_save_session(self):

        session['data'] = self.data
        session.modified = True
        response = current_app.response_class()  # Dummy response object
        current_app.session_interface.save_session(current_app, session, response)

    def _acquire_lock(self):
        try:
            if lock.acquire(blocking=True):
                return True
        except Exception as e:
            raise ValueError(f"Could not acquire lock - '{str(e)}'")
        return False

    def _release_lock(self):
        try:
            lock.release()
        except Exception as e:
            raise ValueError(f"Could not release lock - '{str(e)}'")

    def _set_uuid(self, cuuid):
        if cuuid not in self.data:
            self.data[cuuid] = {}

    def _clear_uuid(self, uuid):
        if uuid in self.data:
            del self.data[uuid]

    def clear_client_id(self, cuuid):
        if not self._acquire_lock():
            return None

        try:
            self._force_read_session()
            self._clear_uuid(cuuid)
            self._force_save_session()

        finally:
            self._release_lock()

    def set_client_id(self, cuuid=None):
        if not self._acquire_lock():
            return None

        try:
            if cuuid is None:
                cuuid = str(uuid.uuid4())  # Generate a new UUID if none is provided

            print("UUID is : ", cuuid)

            self._set_uuid(cuuid)
            return cuuid

        finally:
            self._release_lock()

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
            raise ValueError(f"key '{key}' not found - '{str(e)}'")

    def clear_client_data(self, cuuid, key):
        if not self._acquire_lock():
            return

        try:
            self._force_read_session()
            self._clear_key(cuuid, key)
            self._force_save_session()

        finally:
            self._release_lock()

    def save_client_data(self, cuuid, key, value):
        if not self._acquire_lock():
            return

        try:
            self._force_read_session()
            self._set_key(cuuid, key, value)
            self._force_save_session()

        finally:
            self._release_lock()

    def get_client_data(self, cuuid, key):

        if not self._acquire_lock():
            return None

        try:
            self._force_read_session()
            return self._get_key(cuuid, key)

        finally:
            self._release_lock()
