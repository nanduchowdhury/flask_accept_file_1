import os
import re

# Directory containing HTML files
directory = 'templates'  # Adjust this path as needed

# Regular expression pattern to match `filename='something.js'`
pattern = r"filename='([^/]+\.js)'"

# Function to add 'min/' to matched filenames
def add_min_to_filename(match):
    return f"filename='min/{match.group(1)}'"

# Iterate over all files in the directory
for filename in os.listdir(directory):
    if filename.endswith('.html'):
        filepath = os.path.join(directory, filename)
        
        # Read the file
        with open(filepath, 'r', encoding='utf-8') as file:
            content = file.read()
        
        # Replace `filename='something.js'` with `filename='min/something.js'`
        updated_content = re.sub(pattern, add_min_to_filename, content)
        
        # Write the changes back to the file if replacements were made
        if content != updated_content:
            with open(filepath, 'w', encoding='utf-8') as file:
                file.write(updated_content)
            print(f"Updated {filepath}")
        else:
            print(f"No changes needed for {filepath}")
