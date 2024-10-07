import threading
import uuid

from flask import session, jsonify, current_app, request

import redis
from redis.exceptions import LockError

redis_client = redis.StrictRedis(host='localhost', port=6379)

lock = redis_client.lock('session_lock', timeout=10) 

class BaseClientManager:
    def __init__(self):
        # self.data_lock = threading.Lock()  # Lock for thread-safe operations
        self.dummy = 0
        

    def dump_session(self):
        print("+++++++++++", session)

    def force_read_session(self):
        """Forces a re-read of the session from Redis."""
        # Get the session interface
        session_interface = current_app.session_interface
        
        # Use the existing request context
        if not request:
            raise RuntimeError("Request context is required to read the session.")
        
        # Open the session (this will re-load from Redis)
        session_obj = session_interface.open_session(current_app, request)
        
        # Update the session with the newly read session object
        session.update(session_obj or {})

    def save_session(self):
        
        session.modified = True  # Mark the session as modified

        # Force saving the session manually using Flask's session_interface
        response = current_app.response_class()  # Dummy response object
        current_app.session_interface.save_session(current_app, session, response)
        print("Session saved forcefully.")
        

    def set_client_id(self, client_uuid=None):
        try:
            if lock.acquire(blocking=True):
                """Sets or generates a UUID for the client. Returns the UUID."""
                if client_uuid is None:
                    client_uuid = str(uuid.uuid4())  # Generate a new UUID if none is provided

                # Store the client UUID in the session
                # session['client_uuid'] = client_uuid
                # session['client_data'] = {}

                session.setdefault('client_data', {})

                c_data = session['client_data']
                c_data.setdefault(client_uuid, {})

                # c_data[client_uuid] = {}

                return client_uuid

        except LockError:
            print("Could not acquire lock.")
        finally:
            lock.release()

    def save_client_data(self, client_uuid, key, value):
        try:
            if lock.acquire(blocking=True):

                self.force_read_session();

                print(f"*****save_client_data start... {client_uuid}, {key}")
                
                # Check if client_uuid is provided
                if not client_uuid:
                    raise ValueError("Client UUID is not set. Provide a valid client ID.")

                # Initialize 'client_data' if not present
                if 'client_data' not in session:
                    session['client_data'] = {}

                # Get or initialize the client's data
                c_data = session['client_data']
                client_data = c_data.setdefault(client_uuid, {})

                # Set the value for the specified key
                client_data[key] = value

                # Save the updated client data back to the session
                session['client_data'][client_uuid] = client_data
                
                self.save_session()

                print(f"*****save_client_data done... {client_uuid}, {id(c_data)}")

        except LockError:
            print("Could not acquire lock.")
        finally:
            lock.release()

    def get_client_data(self, client_uuid, key):
        try:
            if lock.acquire(blocking=True):

                self.force_read_session();

                print(f"*****get_client_data start... {client_uuid}, {key}")
                
                # Check if client_uuid is provided
                if not client_uuid:
                    raise ValueError("Client UUID is not set. Provide a valid client ID.")

                # Ensure the session has client_data
                if 'client_data' not in session:
                    raise ValueError(f"Session data not found for UUID {client_uuid}")

                # Get the client's data
                c_data = session['client_data']
                if client_uuid not in c_data:
                    raise ValueError(f"No client_data found for UUID {client_uuid}")

                # Get the key data
                client_data = c_data[client_uuid]
                if key not in client_data:
                    raise ValueError(f"Key '{key}' not found for UUID {client_uuid}")

                print(f"*****get_client_data done... {client_uuid}, {id(c_data)}")
                return client_data[key]

        except LockError:
            print("Could not acquire lock.")
        finally:
            lock.release()
            