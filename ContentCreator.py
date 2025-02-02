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

class ContentCreatorTask(TaskBase):
    def __init__(self, section, gemini_access, error_manager):
        super().__init__()

        self.section = section

        self.gemini_access = gemini_access
        self.error_manager = error_manager

    def run(self):
        obj = ContentCreatorBase(self.section, self.gemini_access, self.error_manager)

        print(f"Generating content for section {self.section}")

        obj.generate_all_contents()
        obj.finish()

class ContentCreatorBase:
    def __init__(self, section, gemini_access, error_manager):

        self.section = section

        self.gemini_access = gemini_access
        self.error_manager = error_manager

        self.section_json_root_map = {
            "hindustani_classical_music": "hindustani_classical_music_json_root",
            "yoga": "yoga_json_root",
            "internal_organ": "internal_organ_json_root"
        }

        self.topic_list = {
            "hindustani_classical_music": 
                [
                "Yaman", "Bhairav", "Bhairavi", "Todi", "Marwa", "Kafi", 
                "Khamaj", "Darbari Kanada", "Desh", "Bageshree", 
                "Malhar", "Hamsadhwani", "Chakravakam", "Charukesi", 
                "Shankarabharanam", "Kalyani", "Kharaharapriya", "Natabhairavi", 
                "Puriya Dhanashree", "Miyan ki Todi", "Jaijaivanti", "Tilak Kamod",
                "Rageshree", "Ahir Bhairav", "Jog", "Madhuvanti", "Kirwani", 
                "Hemant", "Bihag", "Alhaiya Bilawal", "Shuddha Sarang",
                "Kamod", "Basant", "Miyan ki Malhar", "Gaud Malhar",
                "Patdeep", "Shivranjani", "Hansdhwani", "Durga", "Kalingada"
                ],
            "yoga":
                [
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
                ],
            "internal_organ":
                [
                "Brain",
                "Spinal Cord",
                "Heart",
                "Lungs", 
                "Liver", 
                "Kidneys",
                "Spleen",
                "Pancreas",
                "Stomach",
                "Intestines", 
                "Small Intestine",
                "Large Intestine",
                "Gallbladder",
                "Bladder",
                "Endocrine Glands", 
                "Thyroid",
                "Pituitary Gland",
                "Adrenal Glands",
                "Musculoskeletal System", 
                "Bones",
                "Muscles",
                "Joints",
                "Immune System",
                "Lymphatic System",
                "Reproductive System",
                "Male Reproductive System",
                "Female Reproductive System"
                ]
            }

        self.json_store = JsonDataStore(self.section_json_root_map[self.section])
        self.gcs_json_file = f"{self.section}.json"

        self.gcs_manager = GCSManager("kupmanduk-bucket", constants.GCS_ROOT_FOLDER)

        self.google_cse_access = GoogleCSEAccess(self.error_manager)
        self.google_cse_access.initialize()

        self.init()

    def init(self):
        if self.gcs_manager.is_exist(self.gcs_json_file):
            d = self.gcs_manager.read_json(self.gcs_json_file)
            self.json_store.update_from_json_data(d)

    def get_random_topic(self):
        topics = self.topic_list[self.section]
        return random.choice(topics)

    def get_content_for_topic(self, topic):
        content = self.json_store.read_key(topic)

        return content

    def generate_content(self, topic):
        content = self.get_content_for_topic(topic)
        if not content:
            content = self.generate_content_implementation(topic)
            self.json_store.save_key(topic, content)

    def generate_all_contents(self):
        topics = self.topic_list[self.section]
        for t in topics:
            print(f"Generating content for topic {t}")
            self.generate_content(t)

    def generate_content_implementation(self, topic):
        response = self.gemini_access.generate_content(self.section, topic)
        return response

    def finish(self):
        self.gcs_manager.write_json(self.gcs_json_file, self.json_store.get_json_data())

    def generate_youtube_response(self, topic):
        search_line = f"youtube {self.section} {topic}"
        response = self.google_cse_access.search(search_line)
        return response


