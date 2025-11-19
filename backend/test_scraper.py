import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime

def scrape_cafe_menu():
    url = "https://cca.cafebonappetit.com/cafe/cafe/"
    
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Find all meal periods
        meals = {}
        
        # Look for breakfast, lunch, dinner sections
        sections = soup.find_all('section', class_=lambda x: x and 'menu-station' in str(x))
        
        # Try alternative: find by id
        breakfast_section = soup.find(id='breakfast')
        lunch_section = soup.find(id='lunch')
        dinner_section = soup.find(id='dinner')
        
        print("=== Breakfast Section ===")
        if breakfast_section:
            print(breakfast_section.prettify()[:2000])
        else:
            print("Not found by ID")
        
        print("\n=== Lunch Section ===")
        if lunch_section:
            print(lunch_section.prettify()[:2000])
        else:
            print("Not found by ID")
            
        print("\n=== Dinner Section ===")
        if dinner_section:
            print(dinner_section.prettify()[:2000])
        else:
            print("Not found by ID")
        
        # Look for menu items
        menu_items = soup.find_all('button', class_=lambda x: x and 'site-panel__daypart-item' in str(x))
        print(f"\n=== Found {len(menu_items)} menu item buttons ===")
        
        # Try to find the station/category structure
        stations = soup.find_all(class_=lambda x: x and 'station' in str(x).lower())
        print(f"\n=== Found {len(stations)} stations ===")
        if stations:
            print(stations[0].prettify()[:1000])
        
        return {"success": True, "raw_html_length": len(response.text)}
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    result = scrape_cafe_menu()
    print(f"\nResult: {json.dumps(result, indent=2)}")
