import json

class JsonSettings:
    def __init__(self, settings_file):
        self.settings_file = settings_file
        self.load_settings()
    
    def load_settings(self):
        # Read and parse JSON file
        with open(self.settings_file, 'r') as file:
            self.settings = json.load(file)
    
    def getParam(self, key):
        # Retrieve the value of the specified key, if it exists
        keys = key.split('.')
        result = self.settings
        for k in keys:
            if isinstance(result, dict) and k in result:
                result = result[k]
            else:
                return None  # Return None if key path is invalid
        return result

    def isParamSet(self, key):
        # Check if the specified key is set
        return self.getParam(key) is not None
    
    def reload(self):
        # Reload the settings from the JSON file
        self.load_settings()



