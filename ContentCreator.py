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
            "racing": "racing_json_root",
            "winter_sports": "winter_sports_json_root",
            "general_machines": "general_machines_json_root",
            "industrial_machines": "industrial_machines_json_root",
            "oscar_nominated_movies": "oscar_nominated_movies_json_root",
            "grammy_songs": "grammy_songs_json_root",
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
                ],
            "racing":
                [
                    # Types of Racing
                    "Formula 1 (F1)",
                    "MotoGP",
                    "NASCAR",
                    "IndyCar",
                    "Drag Racing",
                    "Rally Racing",
                    "Touring Car Racing",
                    "Endurance Racing (Le Mans, WEC)",
                    "Electric Racing (Formula E)",
                    "Kart Racing",
                    "Off-Road Racing (Baja, Dakar Rally)",
                    "Truck Racing",
                    "Snowmobile Racing",
                    "Boat Racing",
                    "Drone Racing",

                    # Racing Strategies & Techniques
                    "Overtaking Techniques",
                    "Racing Line and Cornering",
                    "Braking Techniques (Trail Braking, Threshold Braking)",
                    "Tire Management Strategies",
                    "Slipstreaming and Drafting",
                    "Fuel Management",
                    "Aerodynamics in Racing",
                    "Qualifying Strategies",

                    # Racing Cars & Motorcycles
                    "Aerodynamics in Race Cars",
                    "Engine Performance and Tuning",
                    "Hybrid and Electric Racing Cars",
                    "Chassis Design and Suspension Setup",
                    "Transmission and Gear Ratios",
                    "Tires and Tire Compounds",
                    "Weight Distribution and Balance",

                    # Famous Races and Championships
                    "Monaco Grand Prix (F1)",
                    "24 Hours of Le Mans",
                    "Daytona 500 (NASCAR)",
                    "Indianapolis 500 (IndyCar)",
                    "Dakar Rally",
                    "Isle of Man TT",
                    "Pikes Peak International Hill Climb",
                    "Bathurst 1000",
                    "Goodwood Festival of Speed",

                    # Racing Safety & Regulations
                    "Helmet and Fireproof Suit Regulations",
                    "HANS Device and Safety Innovations",
                    "FIA and Racing Rulebooks",
                    "Track Safety and Barriers",
                    "Pit Stop Safety Protocols",
                    "Race Flags and Their Meanings",
                    "Penalties and Race Steward Decisions",

                    # Racing Technology & Data Analysis
                    "Telemetrics and Car Data Analysis",
                    "Simulation and Racing Simulators",
                    "Virtual Racing and eSports (iRacing, Gran Turismo)",
                    "Wind Tunnel Testing",
                    "Driver Fitness and Training",

                    # Racing Legends & Teams
                    "Michael Schumacher",
                    "Ayrton Senna",
                    "Lewis Hamilton",
                    "Valentino Rossi",
                    "Dale Earnhardt",
                    "Sebastian Loeb",
                    "Famous Racing Teams (Ferrari, Red Bull Racing, Mercedes AMG, McLaren)",

                    # Business & Sponsorships in Racing
                    "Sponsorship and Advertising in Motorsport",
                    "Team Budgets and Financial Management",
                    "TV Rights and Media Coverage",
                    "Merchandising and Fan Engagement",
                    
                    # Future of Racing
                    "Autonomous Racing (RoboRace)",
                    "Sustainable Racing (Biofuels, Hydrogen, EVs)",
                    "AI in Racing Strategies",
                    "Virtual Reality in Racing Training"
                ],
            "winter_sports":
                [
                    # Ice-Based Sports
                    "Ice Hockey",
                    "Figure Skating",
                    "Speed Skating",
                    "Short Track Speed Skating",
                    "Curling",

                    # Snow-Based Sports
                    "Alpine Skiing",
                    "Cross-Country Skiing",
                    "Ski Jumping",
                    "Snowboarding",
                    "Freestyle Skiing",
                    "Nordic Combined",
                    "Biathlon",

                    # Sledding & Sliding Sports
                    "Bobsleigh",
                    "Luge",
                    "Skeleton",

                    # Extreme & Adventure Winter Sports
                    "Ice Climbing",
                    "Snowmobiling",
                    "Winter Triathlon",
                    "Backcountry Skiing",
                    "Snowshoeing"
                ],
            "industrial_machines":
                [
                    # Industrial Machines
                    "Lathe Machine",
                    "Milling Machine",
                    "CNC Machine",
                    "3D Printer",
                    "Drilling Machine",
                    "Grinding Machine",
                    "Injection Molding Machine",
                    "Press Machine",
                    "Welding Machine",

                    # Construction Machines
                    "Excavator",
                    "Bulldozer",
                    "Crane",
                    "Concrete Mixer",
                    "Road Roller",
                    "Forklift",
                    "Dump Truck",

                    # Automotive Machines
                    "Internal Combustion Engine",
                    "Electric Motor",
                    "Turbocharger",
                    "Transmission System",
                    "Car Suspension System",

                    # Agricultural Machines
                    "Tractor",
                    "Combine Harvester",
                    "Plow",
                    "Seeder",
                    "Irrigation Pump",

                    # Computing & Robotics
                    "Supercomputer",
                    "Quantum Computer",
                    "Autonomous Robot",
                    "3D Scanner",
                    "Industrial Robot Arm",

                    # Medical Machines
                    "MRI Machine",
                    "CT Scanner",
                    "X-ray Machine",
                    "Ultrasound Machine",
                    "Dialysis Machine",
                    "Ventilator",

                    # Aerospace Machines
                    "Jet Engine",
                    "Rocket Engine",
                    "Flight Simulator",
                    "Autopilot System",

                    # Energy Machines
                    "Wind Turbine",
                    "Hydroelectric Generator",
                    "Solar Panel",
                    "Nuclear Reactor",
                    "Steam Turbine"
                ],
            "general_machines":
                [
                    # Office Machines
                    "Printer",
                    "Scanner",
                    "Photocopier",
                    "Shredder",
                    "Laminating Machine",

                    # Household Machines
                    "Washing Machine",
                    "Refrigerator",
                    "Microwave Oven",
                    "Vacuum Cleaner",
                    "Dishwasher",

                    # Simple Machines
                    "Lever",
                    "Pulley",
                    "Wheel and Axle",
                    "Inclined Plane",
                    "Wedge",
                    "Screw"
                ],
            "oscar_nominated_movies":
                [
                    # 2024
                    "The Holdovers",
                    "Killers of the Flower Moon",
                    "Oppenheimer",
                    "Barbie",
                    "The Fabelmans",
                    "The Color Purple",
                    "Poor Things",
                    "The Bikeriders",
                    "American Fiction",
                    
                    # 2023
                    "Everything Everywhere All at Once",
                    "The Banshees of Inisherin",
                    "All Quiet on the Western Front",
                    "Avatar: The Way of Water",
                    "Top Gun: Maverick",
                    "Elvis",
                    "The Whale",
                    "Tár",
                    "Triangle of Sadness",
                    
                    # 2022
                    "CODA",
                    "The Power of the Dog",
                    "Dune",
                    "King Richard",
                    "Belfast",
                    "Licorice Pizza",
                    "Don't Look Up",
                    "Drive My Car",
                    "Nightmare Alley",
                    
                    # 2021
                    "Nomadland",
                    "The Trial of the Chicago 7",
                    "Mank",
                    "Promising Young Woman",
                    "Minari",
                    "Sound of Metal",
                    "Judas and the Black Messiah",
                    "The Father",
                    "A Promising Young Woman",
                    
                    # 2020
                    "Parasite",
                    "1917",
                    "Once Upon a Time in Hollywood",
                    "Jojo Rabbit",
                    "Little Women",
                    "Marriage Story",
                    "The Irishman",
                    "Ford v Ferrari",
                    "Joker",
                    
                    # 2019
                    "Green Book",
                    "A Star is Born",
                    "Roma",
                    "Black Panther",
                    "BlacKkKlansman",
                    "Vice",
                    "The Favourite",
                    "Bohemian Rhapsody",
                    "Green Book",
                    
                    # 2018
                    "The Shape of Water",
                    "Three Billboards Outside Ebbing, Missouri",
                    "Darkest Hour",
                    "Dunkirk",
                    "Phantom Thread",
                    "Call Me by Your Name",
                    "Lady Bird",
                    "The Post",
                    "Get Out",
                    
                    # 2017
                    "Moonlight",
                    "La La Land",
                    "Manchester by the Sea",
                    "Arrival",
                    "Hacksaw Ridge",
                    "Lion",
                    "Hidden Figures",
                    "Fences",
                    "Hell or High Water",
                    
                    # 2016
                    "Spotlight",
                    "The Revenant",
                    "The Big Short",
                    "Mad Max: Fury Road",
                    "Bridge of Spies",
                    "The Martian",
                    "Brooklyn",
                    "Room",
                    "Steve Jobs",
                    
                    # 2015
                    "Birdman",
                    "The Theory of Everything",
                    "Selma",
                    "The Imitation Game",
                    "Whiplash",
                    "American Sniper",
                    "Boyhood",
                    "The Grand Budapest Hotel",
                    "Foxcatcher",
                    
                    # 2014
                    "12 Years a Slave",
                    "Gravity",
                    "American Hustle",
                    "The Wolf of Wall Street",
                    "Captain Phillips",
                    "Dallas Buyers Club",
                    "Her",
                    "Nebraska",
                    "The Lego Movie",
                    
                    # 2013
                    "Argo",
                    "Les Misérables",
                    "Life of Pi",
                    "Lincoln",
                    "Silver Linings Playbook",
                    "Zero Dark Thirty",
                    "Django Unchained",
                    "Beasts of the Southern Wild",
                    "Amour",
                    
                    # 2012
                    "The Artist",
                    "Hugo",
                    "The Help",
                    "Moneyball",
                    "Midnight in Paris",
                    "The Tree of Life",
                    "War Horse",
                    "Extremely Loud & Incredibly Close",
                    "Bridesmaids",
                    
                    # 2011
                    "The King's Speech",
                    "The Social Network",
                    "Black Swan",
                    "Inception",
                    "The Fighter",
                    "127 Hours",
                    "Toy Story 3",
                    "True Grit",
                    "Winter's Bone",
                    
                    # 2010
                    "The Hurt Locker",
                    "Avatar",
                    "Inglourious Basterds",
                    "Precious",
                    "Up",
                    "District 9",
                    "Up in the Air",
                    "A Serious Man",
                    "An Education",
                    
                    # 2009
                    "Slumdog Millionaire",
                    "The Curious Case of Benjamin Button",
                    "Milk",
                    "The Reader",
                    "Frost/Nixon",
                    "The Wrestler",
                    "Frozen River",
                    "Inglourious Basterds",
                    "Star Trek",
                    
                    # 2008
                    "No Country for Old Men",
                    "There Will Be Blood",
                    "Atonement",
                    "Juno",
                    "Michael Clayton",
                    "Sweeney Todd",
                    "The Diving Bell and the Butterfly",
                    "Into the Wild",
                    "Elizabeth: The Golden Age",
                    
                    # 2007
                    "The Departed",
                    "Letters from Iwo Jima",
                    "The Queen",
                    "Babel",
                    "The Pursuit of Happyness",
                    "Little Miss Sunshine",
                    "The Prestige",
                    "Dreamgirls",
                    "The Lives of Others",
                    
                    # 2006
                    "Crash",
                    "Brokeback Mountain",
                    "Capote",
                    "Good Night, and Good Luck",
                    "Munich",
                    "The Constant Gardener",
                    "Syriana",
                    "Walk the Line",
                    "King Kong",
                    
                    # 2005
                    "Million Dollar Baby",
                    "The Aviator",
                    "Ray",
                    "Sideways",
                    "Finding Neverland",
                    "Hotel Rwanda",
                    "The Incredibles",
                    "The Polar Express",
                    "Kinsey",
                    
                    # 2004
                    "The Lord of the Rings: The Return of the King",
                    "Lost in Translation",
                    "Master and Commander",
                    "Mystic River",
                    "Seabiscuit",
                    "Cold Mountain",
                    "The Last Samurai",
                    "The Cooler",
                    "The Big Fish",
                    
                    # 2003
                    "Chicago",
                    "The Pianist",
                    "The Hours",
                    "Lord of the Rings: The Two Towers",
                    "Gangs of New York",
                    "The Good Girl",
                    "Catch Me If You Can",
                    "The Lord of the Rings: The Fellowship of the Ring",
                    "The Lord of the Rings: The Fellowship",
                    
                    # 2002
                    "A Beautiful Mind",
                    "Moulin Rouge!",
                    "Black Hawk Down",
                    "Gosford Park",
                    "The Lord of the Rings: The Fellowship of the Ring",
                ],
            "grammy_songs":
                [
                    # 2023
                    "Just Like That - Bonnie Raitt",
                    "About Damn Time - Lizzo",
                    "The Heart Part 5 - Kendrick Lamar",
                    "Easy on Me - Adele",
                    "Bad Habit - Steve Lacy",
                    "As It Was - Harry Styles",
                    "Break My Soul - Beyoncé",
                    "God Did - DJ Khaled ft. Rick Ross, Lil Wayne, Jay-Z, John Legend, and Fridayy",
                    "ABCDEFU - GAYLE",
                    "All Too Well (10 Minute Version) - Taylor Swift",

                    # 2022
                    "Leave the Door Open - Silk Sonic (Bruno Mars & Anderson .Paak)",
                    "drivers license - Olivia Rodrigo",
                    "Happier Than Ever - Billie Eilish",
                    "Kiss Me More - Doja Cat ft. SZA",
                    "Peaches - Justin Bieber ft. Daniel Caesar & Giveon",
                    "Right on Time - Brandi Carlile",
                    "Montero (Call Me By Your Name) - Lil Nas X",
                    "Bad Habits - Ed Sheeran",
                    "A Beautiful Noise - Alicia Keys & Brandi Carlile",
                    "Fight for You - H.E.R.",

                    # 2021
                    "I Can't Breathe - H.E.R.",
                    "Black Parade - Beyoncé",
                    "The Box - Roddy Ricch",
                    "Cardigan - Taylor Swift",
                    "Circles - Post Malone",
                    "Don't Start Now - Dua Lipa",
                    "Everything I Wanted - Billie Eilish",
                    "If the World Was Ending - JP Saxe ft. Julia Michaels",

                    # 2020
                    "Bad Guy - Billie Eilish",
                    "Always Remember Us This Way - Lady Gaga",
                    "Bring My Flowers Now - Tanya Tucker",
                    "Hard Place - H.E.R.",
                    "Lover - Taylor Swift",
                    "Norman F***ing Rockwell - Lana Del Rey",
                    "Someone You Loved - Lewis Capaldi",
                    "Truth Hurts - Lizzo",

                    # 2019
                    "This Is America - Childish Gambino",
                    "All the Stars - Kendrick Lamar & SZA",
                    "Boo'd Up - Ella Mai",
                    "God's Plan - Drake",
                    "In My Blood - Shawn Mendes",
                    "The Joke - Brandi Carlile",
                    "The Middle - Zedd, Maren Morris & Grey",
                    "Shallow - Lady Gaga & Bradley Cooper",

                    # 2018
                    "That's What I Like - Bruno Mars",
                    "Despacito - Luis Fonsi & Daddy Yankee ft. Justin Bieber",
                    "4:44 - Jay-Z",
                    "Issues - Julia Michaels",
                    "1-800-273-8255 - Logic ft. Alessia Cara & Khalid",
                    "Praying - Kesha",
                    "Broken Halos - Chris Stapleton",
                    "Stay - Zedd & Alessia Cara",

                    # 2017
                    "Hello - Adele",
                    "Formation - Beyoncé",
                    "I Took a Pill in Ibiza - Mike Posner",
                    "Love Yourself - Justin Bieber",
                    "7 Years - Lukas Graham",

                    # 2016
                    "Thinking Out Loud - Ed Sheeran",
                    "Alright - Kendrick Lamar",
                    "Blank Space - Taylor Swift",
                    "Girl Crush - Little Big Town",
                    "See You Again - Wiz Khalifa ft. Charlie Puth",

                    # 2015
                    "Stay with Me (Darkchild Version) - Sam Smith",
                    "All About That Bass - Meghan Trainor",
                    "Chandelier - Sia",
                    "Shake It Off - Taylor Swift",
                    "Take Me to Church - Hozier",

                    # 2014
                    "Royals - Lorde",
                    "Just Give Me a Reason - Pink ft. Nate Ruess",
                    "Locked Out of Heaven - Bruno Mars",
                    "Roar - Katy Perry",
                    "Same Love - Macklemore & Ryan Lewis ft. Mary Lambert",

                    # 2013
                    "We Are Young - Fun. ft. Janelle Monáe",
                    "Adorn - Miguel",
                    "Call Me Maybe - Carly Rae Jepsen",
                    "Stronger (What Doesn't Kill You) - Kelly Clarkson",
                    "The A Team - Ed Sheeran",

                    # 2012
                    "Rolling in the Deep - Adele",
                    "All of the Lights - Kanye West, Rihanna, Kid Cudi & Fergie",
                    "The Cave - Mumford & Sons",
                    "Grenade - Bruno Mars",
                    "Holocene - Bon Iver",

                    # 2011
                    "Need You Now - Lady Antebellum",
                    "Beg Steal or Borrow - Ray LaMontagne",
                    "F*** You - CeeLo Green",
                    "The House That Built Me - Miranda Lambert",
                    "Love the Way You Lie - Eminem ft. Rihanna",

                    # 2010
                    "Single Ladies (Put a Ring on It) - Beyoncé",
                    "Poker Face - Lady Gaga",
                    "Pretty Wings - Maxwell",
                    "Use Somebody - Kings of Leon",
                    "You Belong with Me - Taylor Swift",

                    # 2009
                    "Viva la Vida - Coldplay",
                    "American Boy - Estelle ft. Kanye West",
                    "Chasing Pavements - Adele",
                    "I'm Yours - Jason Mraz",
                    "Love Song - Sara Bareilles",

                    # 2008
                    "Rehab - Amy Winehouse",
                    "Before He Cheats - Carrie Underwood",
                    "Hey There Delilah - Plain White T's",
                    "Like a Star - Corinne Bailey Rae",
                    "Umbrella - Rihanna ft. Jay-Z",

                    # 2007
                    "Not Ready to Make Nice - Dixie Chicks",
                    "Be Without You - Mary J. Blige",
                    "Jesus, Take the Wheel - Carrie Underwood",
                    "Put Your Records On - Corinne Bailey Rae",
                    "You're Beautiful - James Blunt",

                    # 2006
                    "Sometimes You Can't Make It on Your Own - U2",
                    "Bless the Broken Road - Rascal Flatts",
                    "Devils & Dust - Bruce Springsteen",
                    "Ordinary People - John Legend",
                    "We Belong Together - Mariah Carey",

                    # 2005
                    "Daughters - John Mayer",
                    "If I Ain't Got You - Alicia Keys",
                    "Jesus Walks - Kanye West"
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
        search_line = search_line.replace('_', ' ')
        response = self.google_cse_access.search(search_line)
        return response


