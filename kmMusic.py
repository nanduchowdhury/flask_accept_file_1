import random

from google_CSE_access import GoogleCSEAccess


class KupmandukMusic:
    def __init__(self, gemini_access, error_manager):
        
        self.gemini_access = gemini_access
        self.error_manager = error_manager

        self.google_cse_access = GoogleCSEAccess(self.error_manager)
        self.google_cse_access.initialize()

        self.__ragaList = [
            "Yaman", "Bhairav", "Bhairavi", "Todi", "Marwa", "Kafi", 
            "Khamaj", "Darbari Kanada", "Desh", "Bageshree", 
            "Malhar", "Hamsadhwani", "Chakravakam", "Charukesi", 
            "Shankarabharanam", "Kalyani", "Kharaharapriya", "Natabhairavi", 
            "Puriya Dhanashree", "Miyan ki Todi", "Jaijaivanti", "Tilak Kamod",
            "Rageshree", "Ahir Bhairav", "Jog", "Madhuvanti", "Kirwani", 
            "Hemant", "Bihag", "Alhaiya Bilawal", "Shuddha Sarang",
            "Kamod", "Basant", "Miyan ki Malhar", "Gaud Malhar",
            "Patdeep", "Shivranjani", "Hansdhwani", "Durga", "Kalingada"
        ]

    def get_one_raga(self):
        return random.choice(self.__ragaList)

    def generate_youtube_response(self, raga):
        
        search_line = f"youtube raga {raga}."
        response = self.google_cse_access.search(search_line)

        return response

    def generate_explain_raga_response(self, raga):

        response = self.gemini_access.generate_explain_raga_response(raga)

        return response


class KupmandukYoga:
    def __init__(self, gemini_access, error_manager):
        
        self.gemini_access = gemini_access
        self.error_manager = error_manager

        self.google_cse_access = GoogleCSEAccess(self.error_manager)
        self.google_cse_access.initialize()

        self.__yogaList = [
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
        ]


    def get_one_yoga(self):
        return random.choice(self.__yogaList)

    def generate_youtube_response(self, yoga):
        
        search_line = f"youtube yoga {yoga}."
        response = self.google_cse_access.search(search_line)

        return response

    def generate_explain_yoga_response(self, yoga):

        response = self.gemini_access.generate_explain_yoga_response(yoga)

        return response
