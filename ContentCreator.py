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
            "internal_organ": "internal_organ_json_root",
            "astronomy": "astronomy_json_root",
            "golf": "golf_json_root",
            "nutrition": "nutrition_json_root",
            "stocks": "stocks_json_root",
            "mutual_funds": "mutual_funds_json_root",
            "economics": "economics_json_root"
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
                ],
            "astronomy":
                [
                    "Celestial Objects",
                    "Stars",
                    "Planets",
                    "Moons", 
                    "Comets", 
                    "Asteroids", 
                    "Meteors", 
                    "Galaxies", 
                    "Nebulae",
                    "Black Holes",
                    "Cosmology", 
                    "Big Bang Theory", 
                    "Dark Matter", 
                    "Dark Energy", 
                    "Stellar Evolution", 
                    "Star Formation", 
                    "Supernovae", 
                    "Stellar Remnants", 
                    "Planetary Systems", 
                    "Exoplanets", 
                    "Astrophysics", 
                    "Astrobiology", 
                    "Observational Astronomy", 
                    "Telescopes", 
                    "Space Exploration", 
                    "Spacecraft", 
                    "Missions to Other Planets", 
                    "History of Astronomy", 
                    "Famous Astronomers", 
                    "Astrophysics Concepts", 
                    "Relativity", 
                    "Quantum Mechanics", 
                    "Astrochemistry", 
                    "Space Weather", 
                    "Astrobiology" 
                ],
            "golf":
                [
                    "Golf Rules", 
                    "Etiquette", 
                    "Swing Techniques", 
                    "Driving", 
                    "Iron Play", 
                    "Short Game", 
                    "Chipping", 
                    "Pitching", 
                    "Putting", 
                    "Course Management", 
                    "Hazard Play", 
                    "Bunker Play", 
                    "Water Hazards", 
                    "Mental Game", 
                    "Focus and Concentration", 
                    "Pressure Handling", 
                    "Course Strategy", 
                    "Club Selection", 
                    "Shot Shaping", 
                    "Equipment", 
                    "Clubs", 
                    "Balls", 
                    "Golf Course Design", 
                    "History of Golf", 
                    "Famous Golfers", 
                    "Golf Tournaments", 
                    "PGA Tour", 
                    "LPGA Tour", 
                    "European Tour", 
                    "Golf Competitions", 
                    "Amateur Golf", 
                    "Professional Golf" 
                ],
            "nutrition":
                [
                    "Macronutrients", 
                    "Carbohydrates", 
                    "Proteins", 
                    "Fats", 
                    "Micronutrients", 
                    "Vitamins", 
                    "Minerals", 
                    "Nutrition and Health", 
                    "Weight Management", 
                    "Chronic Diseases", 
                    "Immune System", 
                    "Mental Health", 
                    "Digestive Health", 
                    "Sports Nutrition", 
                    "Special Populations", 
                    "Pregnancy and Lactation", 
                    "Childhood and Adolescence", 
                    "Older Adults", 
                    "Food Science and Safety", 
                    "Food Composition and Analysis", 
                    "Food Safety", 
                    "Food Labeling", 
                    "Nutrition and Society", 
                    "Food Security and Sustainability", 
                    "Public Health Nutrition", 
                    "Research and Methodology", 
                    "Nutritional Epidemiology", 
                    "Clinical Nutrition" 
                ],
            "mutual_funds":
                [
                    "Types of Mutual Funds",
                    "Equity Mutual Funds",
                    "Debt Mutual Funds",
                    "Hybrid Mutual Funds",
                    "Index Funds",
                    "Exchange-Traded Funds (ETFs)",
                    "Mutual Fund NAV (Net Asset Value)",
                    "Expense Ratio in Mutual Funds",
                    "Risk and Returns in Mutual Funds",
                    "Systematic Investment Plan (SIP)",
                    "Lumpsum Investment vs SIP",
                    "Mutual Fund Taxation",
                    "Growth vs Dividend Option in Mutual Funds",
                    "Direct vs Regular Mutual Funds",
                    "Fund Manager and Their Role",
                    "How to Choose a Mutual Fund",
                    "Mutual Fund Ratings and Analysis",
                    "Asset Management Companies (AMCs)",
                    "SEBI Regulations for Mutual Funds",
                    "Mutual Fund Benchmarks and Performance Evaluation",
                    "Mutual Fund Portfolio Diversification",
                    "Exit Load and Other Charges",
                    "Mutual Fund Investment Strategies",
                    "Fund of Funds (FoF)",
                    "Sectoral and Thematic Funds",
                    "International Mutual Funds",
                    "Open-ended vs Close-ended Mutual Funds",
                    "Mutual Funds vs Fixed Deposits",
                    "Mutual Funds vs Stocks",
                    "Liquid Funds and Emergency Funds",
                    "ELSS (Equity Linked Savings Scheme) and Tax Saving Mutual Funds"
                ],
            "stocks":
                [
                    "Introduction to Stock Market",
                    "Types of Stocks (Common vs Preferred)",
                    "Stock Exchanges (NYSE, NASDAQ, BSE, NSE, etc.)",
                    "Primary Market vs Secondary Market",
                    "Stock Indices (S&P 500, Dow Jones, NIFTY 50, etc.)",
                    "Blue-Chip Stocks",
                    "Penny Stocks",
                    "Growth Stocks vs Value Stocks",
                    "Dividend Stocks",
                    "IPO (Initial Public Offering)",
                    "Stock Market Orders (Market Order, Limit Order, Stop-Loss Order, etc.)",
                    "Fundamental Analysis of Stocks",
                    "Technical Analysis of Stocks",
                    "Stock Valuation Methods (PE Ratio, PB Ratio, EV/EBITDA, etc.)",
                    "Stock Market Trends and Cycles",
                    "Bull Market vs Bear Market",
                    "Short Selling and Margin Trading",
                    "Stock Market Risks and Volatility",
                    "Sectoral Stocks (Technology, Healthcare, Finance, etc.)",
                    "Stock Splits and Reverse Splits",
                    "Market Capitalization (Large Cap, Mid Cap, Small Cap)",
                    "Stock Dividends and Buybacks",
                    "Day Trading vs Swing Trading vs Long-Term Investing",
                    "ETFs (Exchange-Traded Funds) vs Stocks",
                    "Stock Portfolio Diversification",
                    "Insider Trading and Market Regulations",
                    "Stock Market Psychology and Behavioral Finance",
                    "Derivatives (Options, Futures, etc.)",
                    "Cryptocurrency vs Stocks",
                    "Impact of Interest Rates on Stocks",
                    "Role of Central Banks in Stock Markets"
                ],
            "economics":
                [
                    # Microeconomics
                    "Demand and Supply",
                    "Elasticity of Demand and Supply",
                    "Consumer Behavior and Utility Theory",
                    "Market Structures (Perfect Competition, Monopoly, Oligopoly)",
                    "Game Theory and Strategic Behavior",
                    "Production and Costs",
                    "Labor Markets and Wages",
                    "Externalities and Market Failure",
                    "Public Goods and Free Rider Problem",
                    "Behavioral Economics",

                    # Macroeconomics
                    "Gross Domestic Product (GDP) and Economic Growth",
                    "Inflation and Deflation",
                    "Unemployment and Labor Market Dynamics",
                    "Fiscal Policy and Government Spending",
                    "Monetary Policy and Central Banks",
                    "Interest Rates and Money Supply",
                    "Business Cycles and Economic Recessions",
                    "International Trade and Balance of Payments",
                    "Exchange Rates and Currency Markets",
                    "National Debt and Deficit",

                    # Development Economics
                    "Poverty and Income Inequality",
                    "Human Development Index (HDI)",
                    "Economic Growth vs Economic Development",
                    "Sustainable Development",
                    "Foreign Aid and Economic Assistance",
                    "Microfinance and Financial Inclusion",
                    "Industrialization and Urbanization",

                    # International Economics
                    "Comparative Advantage and Trade Theories",
                    "Globalization and Trade Liberalization",
                    "WTO, IMF, and World Bank",
                    "Tariffs, Quotas, and Trade Barriers",
                    "Foreign Direct Investment (FDI)",
                    "Exchange Rate Systems (Fixed, Floating, Pegged)",
                    "Economic Integration (EU, NAFTA, ASEAN)",
                    "Currency Crises and Sovereign Debt",

                    # Financial Economics
                    "Stock Markets and Asset Pricing",
                    "Bonds and Interest Rate Determination",
                    "Risk and Uncertainty in Financial Markets",
                    "Financial Crises and Market Bubbles",
                    "Banking System and Financial Intermediation",
                    "Cryptocurrency and Decentralized Finance (DeFi)",

                    # Environmental & Resource Economics
                    "Climate Change and Economic Policy",
                    "Carbon Tax and Emissions Trading",
                    "Renewable vs Non-Renewable Resources",
                    "Sustainability and Green Economics",
                    "Natural Resource Management",

                    # Political Economy
                    "Capitalism vs Socialism vs Mixed Economy",
                    "Economic Systems and Government Intervention",
                    "Public Choice Theory",
                    "Economic Policies and Political Ideologies",
                    "Economic Consequences of War",

                    # Emerging Topics
                    "Digital Economy and E-Commerce",
                    "Gig Economy and Freelancing",
                    "Automation and AI in the Workforce",
                    "Universal Basic Income (UBI)",
                    "Future of Work and Remote Economy"
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


