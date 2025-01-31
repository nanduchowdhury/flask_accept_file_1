import random

from ThreadPool import ThreadPool, TaskStatus, TaskBase
from google_CSE_access import GoogleCSEAccess
from gcs_manager import GCSManager
import constants

import json

class JsonDataStore:
    def __init__(self, json_data_root_name: str):
        self.root_name = json_data_root_name
        self.data_store = {self.root_name: {}}
    
    def save_key(self, key: str, data):
        """Saves the key-data pair in the JSON root."""
        self.data_store[self.root_name][key] = data
    
    def read_key(self, key: str):
        """Reads the data for the given key from the JSON root and returns it."""
        return self.data_store[self.root_name].get(key, None)
    
    def get_json_string(self):
        """Returns the stored data as a JSON string."""
        return json.dumps(self.data_store, indent=2)
    
    def get_json_data(self):
        """Returns the stored data as a dictionary."""
        return self.data_store
    

    def update_from_json_data(self, json_data):
        """Update the internal JSON structure with a given JSON data struct."""
        if isinstance(json_data, dict) and self.root_name in json_data:
            self.data_store[self.root_name].update(json_data[self.root_name])

    def update_from_json_string(self, json_string: str):
        """Loads data from a JSON string."""
        try:
            loaded_data = json.loads(json_string)
            if self.root_name in loaded_data:
                self.data_store[self.root_name] = loaded_data[self.root_name]
        except json.JSONDecodeError:
            pass


class MusicCreatorTask(TaskBase):
    def __init__(self, gemini_access, error_manager):
        super().__init__()
        self.gemini_access = gemini_access
        self.error_manager = error_manager

    def run(self):
        obj = ContentCreatorHindustaniClassical(self.gemini_access, self.error_manager)

        obj.generate_all_contents()
        obj.finish()

class YogaCreatorTask(TaskBase):
    def __init__(self, gemini_access, error_manager):
        super().__init__()
        self.gemini_access = gemini_access
        self.error_manager = error_manager

    def run(self):
        obj = ContentCreatorYoga(self.gemini_access, self.error_manager)

        obj.generate_all_contents()
        obj.finish()

class ContentCreatorBase:
    def __init__(self, content_topic, gemini_access, error_manager):

        self.content_json_root_map = {
            "hindustani_classical_music": "hindustani_classical_music_json_root",
            "yoga": "yoga_json_root"
        }

        self.topic_list = []

        self.json_store = JsonDataStore(self.content_json_root_map[content_topic])
        self.gcs_json_file = f"{content_topic}.json"

        self.gcs_manager = GCSManager("kupmanduk-bucket", constants.GCS_ROOT_FOLDER)

        self.gemini_access = gemini_access
        self.error_manager = error_manager

        self.google_cse_access = GoogleCSEAccess(self.error_manager)
        self.google_cse_access.initialize()

        self.init()

    def init(self):
        if self.gcs_manager.is_exist(self.gcs_json_file):
            d = self.gcs_manager.read_json(self.gcs_json_file)
            self.json_store.update_from_json_data(d)

    def update_topic_list(self, topic_list):
        self.topic_list = topic_list

    def get_random_topic(self):
        return random.choice(self.topic_list)

    def get_content_for_key(self, key):
        content = self.json_store.read_key(key)

        return content

    def generate_content_for_key(self, key):
        content = self.get_content_for_key(key)
        if not content:
            content = self.generate_content_implementation(key)
            self.json_store.save_key(key, content)

    def generate_all_contents(self):
        for key in self.topic_list:
            self.generate_content_for_key(key)

    def generate_content_implementation(self, key):
        """Derived classes should override this method with task logic."""
        raise NotImplementedError("Subclasses must implement this method")

    def finish(self):
        self.gcs_manager.write_json(self.gcs_json_file, self.json_store.get_json_data())

class ContentCreatorHindustaniClassical(ContentCreatorBase):
    def __init__(self, gemini_access, error_manager):
        super().__init__("hindustani_classical_music", gemini_access, error_manager)

        self.update_topic_list([
            "Yaman", "Bhairav", "Bhairavi", "Todi", "Marwa", "Kafi", 
            "Khamaj", "Darbari Kanada", "Desh", "Bageshree", 
            "Malhar", "Hamsadhwani", "Chakravakam", "Charukesi", 
            "Shankarabharanam", "Kalyani", "Kharaharapriya", "Natabhairavi", 
            "Puriya Dhanashree", "Miyan ki Todi", "Jaijaivanti", "Tilak Kamod",
            "Rageshree", "Ahir Bhairav", "Jog", "Madhuvanti", "Kirwani", 
            "Hemant", "Bihag", "Alhaiya Bilawal", "Shuddha Sarang",
            "Kamod", "Basant", "Miyan ki Malhar", "Gaud Malhar",
            "Patdeep", "Shivranjani", "Hansdhwani", "Durga", "Kalingada"
        ])

    def generate_youtube_response(self, raga):
        search_line = f"youtube raga {raga}"
        response = self.google_cse_access.search(search_line)
        return response

    def generate_content_implementation(self, key):
        response = self.gemini_access.generate_explain_raga_response(key)
        return response

class ContentCreatorYoga(ContentCreatorBase):
    def __init__(self, gemini_access, error_manager):
        super().__init__("yoga", gemini_access, error_manager)

        self.update_topic_list([
            "Tadasana (Mountain Pose)",
            "Vrikshasana (Tree Pose)",
            "Adho Mukha Svanasana (Downward Dog Pose)",
            "Uttanasana (Standing Forward Bend)",
            "Trikonasana (Triangle Pose)",
            "Virabhadrasana I (Warrior I Pose)",
            "Virabhadrasana II (Warrior II Pose)",
            "Virabhadrasana III (Warrior III Pose)",
            "Parivrtta Trikonasana (Revolved Triangle Pose)",
            "Utkatasana (Chair Pose)",
            "Bhujangasana (Cobra Pose)",
            "Dhanurasana (Bow Pose)",
            "Salabhasana (Locust Pose)",
            "Setu Bandhasana (Bridge Pose)",
            "Paschimottanasana (Seated Forward Bend)",
            "Janu Sirsasana (Head-to-Knee Pose)",
            "Ardha Matsyendrasana (Half Lord of the Fishes Pose)",
            "Padmasana (Lotus Pose)",
            "Sukhasana (Easy Pose)",
            "Balasana (Child's Pose)",
            "Matsyasana (Fish Pose)",
            "Halasana (Plow Pose)",
            "Sarvangasana (Shoulder Stand Pose)",
            "Sirsasana (Headstand Pose)",
            "Chaturanga Dandasana (Four-Limbed Staff Pose)",
            "Navasana (Boat Pose)",
            "Anjaneyasana (Low Lunge Pose)",
            "Bakasana (Crow Pose)",
            "Kapotasana (Pigeon Pose)",
            "Eka Pada Rajakapotasana (One-Legged King Pigeon Pose)",
            "Shavasana (Corpse Pose)"
        ])

    def generate_youtube_response(self, yoga):
        search_line = f"youtube yoga {yoga}"
        response = self.google_cse_access.search(search_line)
        return response

    def generate_content_implementation(self, key):
        response = self.gemini_access.generate_explain_yoga_response(key)
        return response
