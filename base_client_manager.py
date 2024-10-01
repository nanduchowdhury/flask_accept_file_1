import threading
import uuid

class BaseClientManager:
    def __init__(self):
        self.client_data = {}  # Dictionary to store client-specific data
        self.data_lock = threading.Lock()  # Lock for thread-safe operations

    def set_client_id(self, client_uuid=None):
        """Sets or generates a UUID for the client. Returns the UUID."""
        if client_uuid is None:
            client_uuid = str(uuid.uuid4())  # Generate a new UUID if none is provided
        return client_uuid

    def save_client_data(self, client_uuid, key, value):
        """Save client-related data based on the provided client UUID."""
        if client_uuid is None:
            raise ValueError("Client UUID is not set. Provide a valid client ID.")

        with self.data_lock:
            if client_uuid not in self.client_data:
                self.client_data[client_uuid] = {}
            self.client_data[client_uuid][key] = value

    def get_client_data(self, client_uuid, key):
        """Retrieve client-related data based on the provided client UUID."""
        if client_uuid is None:
            raise ValueError("Client UUID is not set. Provide a valid client ID.")

        with self.data_lock:
            return self.client_data.get(client_uuid, {}).get(key, None)
