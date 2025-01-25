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


