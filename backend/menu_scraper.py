"""
Cafe Bon Appetit Menu Scraper
Scrapes daily menu from CCA Cafe website
"""

import requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone
import logging
import re
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)


class CafeMenuScraper:
    """Scraper for Cafe Bon Appetit menu"""
    
    BASE_URL = "https://cca.cafebonappetit.com/cafe/cafe/"
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
    
    def scrape_menu(self, date: Optional[str] = None) -> Dict:
        """
        Scrape menu for a specific date
        
        Args:
            date: Date in format YYYY-MM-DD, defaults to today
            
        Returns:
            Dict with menu data organized by meal period
        """
        try:
            # If date provided, construct URL with date
            url = self.BASE_URL
            if date:
                url = f"https://cca.cafebonappetit.com/cafe/{date}/"
            
            logger.info(f"Scraping menu from: {url}")
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            menu_data = {
                'date': date or datetime.now(timezone.utc).strftime('%Y-%m-%d'),
                'scraped_at': datetime.now(timezone.utc).isoformat(),
                'breakfast': self._parse_meal_period(soup, 'breakfast'),
                'lunch': self._parse_meal_period(soup, 'lunch'),
                'dinner': self._parse_meal_period(soup, 'dinner')
            }
            
            # Count total items
            total_items = (
                len(menu_data['breakfast']) + 
                len(menu_data['lunch']) + 
                len(menu_data['dinner'])
            )
            
            logger.info(f"Successfully scraped {total_items} menu items")
            return {
                'success': True,
                'menu': menu_data,
                'total_items': total_items
            }
            
        except Exception as e:
            logger.error(f"Error scraping menu: {str(e)}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'menu': None
            }
    
    def _parse_meal_period(self, soup: BeautifulSoup, period: str) -> List[Dict]:
        """Parse a specific meal period (breakfast/lunch/dinner)"""
        items = []
        
        # Find the section by ID
        section = soup.find('section', id=period)
        if not section:
            logger.warning(f"Could not find section for {period}")
            return items
        
        # Get time info
        container = section.find('div', {'data-js': 'site-panel__daypart-container'})
        start_time = container.get('data-start-time', '') if container else ''
        end_time = container.get('data-end-time', '') if container else ''
        
        # Find all stations (categories)
        stations = section.find_all('div', class_='station-title-inline-block')
        
        for station in stations:
            # Get station name
            station_title_elem = station.find('h3', class_='site-panel__daypart-station-title')
            station_name = station_title_elem.get_text(strip=True) if station_title_elem else 'Unknown'
            
            # Find all menu items in this station
            menu_items = station.find_all('div', {'data-js': 'site-panel__daypart-item'})
            
            for item_div in menu_items:
                item_data = self._parse_menu_item(item_div, period, station_name, start_time, end_time)
                if item_data:
                    items.append(item_data)
        
        return items
    
    def _parse_menu_item(
        self, 
        item_div, 
        period: str, 
        station: str,
        start_time: str,
        end_time: str
    ) -> Optional[Dict]:
        """Parse a single menu item"""
        try:
            item_id = item_div.get('data-id', '')
            
            # Get item title
            title_btn = item_div.find('button', {'data-js': 'site-panel__daypart-item-title'})
            if not title_btn:
                return None
            
            # Extract title text (excluding icon alt text)
            title = ''
            for content in title_btn.contents:
                if isinstance(content, str):
                    title += content.strip()
                elif content.name != 'span' or 'site-panel__daypart-item-cor-icons' not in content.get('class', []):
                    title += content.get_text(strip=True)
            
            title = title.strip()
            
            # Get dietary icons
            dietary_icons = []
            icon_span = title_btn.find('span', class_='site-panel__daypart-item-cor-icons')
            if icon_span:
                icons = icon_span.find_all('img')
                for icon in icons:
                    alt_text = icon.get('alt', '')
                    # Extract dietary type from alt text
                    if 'Vegetarian' in alt_text:
                        dietary_icons.append('vegetarian')
                    if 'Vegan' in alt_text:
                        dietary_icons.append('vegan')
                    if 'Gluten' in alt_text:
                        dietary_icons.append('gluten-free')
                    if 'Farm to Fork' in alt_text:
                        dietary_icons.append('farm-to-fork')
                    if 'Seafood Watch' in alt_text:
                        dietary_icons.append('seafood-watch')
            
            # Get description
            description = ''
            desc_div = item_div.find('div', class_='site-panel__daypart-item-description')
            if desc_div:
                # Get main description
                desc_p = desc_div.find('p')
                if desc_p:
                    description = desc_p.get_text(strip=True)
                
                # Check for sides/ingredients
                sides_div = desc_div.find('div', class_='site-panel__daypart-item-description-sides')
                if sides_div:
                    sides_text = sides_div.get_text(strip=True)
                    if sides_text:
                        description += f" | {sides_text}"
            
            # Get calories if available
            calories = None
            cal_div = item_div.find('div', class_='site-panel__daypart-item-calories')
            if cal_div:
                cal_text = cal_div.get_text(strip=True)
                # Extract number from "XXX cal."
                cal_match = re.search(r'(\d+)', cal_text)
                if cal_match:
                    calories = int(cal_match.group(1))
            
            return {
                'item_id': item_id,
                'name': title,
                'description': description,
                'station': station,
                'meal_period': period,
                'start_time': start_time,
                'end_time': end_time,
                'dietary_tags': dietary_icons,
                'calories': calories
            }
            
        except Exception as e:
            logger.error(f"Error parsing menu item: {str(e)}")
            return None


async def scrape_and_save_menu_async(db, date: Optional[str] = None) -> Dict:
    """
    Async version: Scrape menu and save to database
    
    Args:
        db: Database instance
        date: Date to scrape (YYYY-MM-DD), defaults to today
    
    Returns:
        Dict with scrape results
    """
    scraper = CafeMenuScraper()
    result = scraper.scrape_menu(date)
    
    if not result['success']:
        return result
    
    try:
        menu_data = result['menu']
        scraped_date = menu_data['date']
        
        # Delete existing menu items for this date
        await db.cafe_menu_items.delete_many({'date': scraped_date})
        
        # Prepare all items for insertion
        all_items = []
        for period in ['breakfast', 'lunch', 'dinner']:
            for item in menu_data[period]:
                item['date'] = scraped_date
                item['scraped_at'] = menu_data['scraped_at']
                all_items.append(item)
        
        if all_items:
            await db.cafe_menu_items.insert_many(all_items)
        
        # Update last scrape metadata
        await db.scrape_metadata.update_one(
            {'key': 'last_menu_scrape'},
            {
                '$set': {
                    'key': 'last_menu_scrape',
                    'last_scraped': menu_data['scraped_at'],
                    'last_date': scraped_date,
                    'items_count': len(all_items),
                    'success': True
                }
            },
            upsert=True
        )
        
        logger.info(f"Successfully saved {result['total_items']} menu items to database")
        return result
        
    except Exception as e:
        logger.error(f"Error saving menu to database: {str(e)}", exc_info=True)
        return {
            'success': False,
            'error': f"Failed to save to database: {str(e)}"
        }

def scrape_and_save_menu(db, date: Optional[str] = None) -> Dict:
    """
    Sync wrapper for backward compatibility (used by scheduler)
    
    Args:
        db: Database instance
        date: Date to scrape (YYYY-MM-DD), defaults to today
    
    Returns:
        Dict with scrape results
    """
    scraper = CafeMenuScraper()
    result = scraper.scrape_menu(date)
    
    if not result['success']:
        return result
    
    try:
        menu_data = result['menu']
        scraped_date = menu_data['date']
        
        # Delete existing menu items for this date
        import asyncio
        
        # Check if we're already in an event loop
        try:
            loop = asyncio.get_running_loop()
            # If we're in a loop, we can't use run_until_complete
            # This should only be called from the scheduler which runs in a separate thread
            logger.warning("scrape_and_save_menu called from within event loop - use async version instead")
            return {
                'success': False,
                'error': "Cannot run sync version from within event loop"
            }
        except RuntimeError:
            # No event loop running, safe to create one
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        async def save_items():
            await db.cafe_menu_items.delete_many({'date': scraped_date})
            
            # Prepare all items for insertion
            all_items = []
            for period in ['breakfast', 'lunch', 'dinner']:
                for item in menu_data[period]:
                    item['date'] = scraped_date
                    item['scraped_at'] = menu_data['scraped_at']
                    all_items.append(item)
            
            if all_items:
                await db.cafe_menu_items.insert_many(all_items)
            
            # Update last scrape metadata
            await db.scrape_metadata.update_one(
                {'key': 'last_menu_scrape'},
                {
                    '$set': {
                        'key': 'last_menu_scrape',
                        'last_scraped': menu_data['scraped_at'],
                        'last_date': scraped_date,
                        'items_count': len(all_items),
                        'success': True
                    }
                },
                upsert=True
            )
        
        loop.run_until_complete(save_items())
        loop.close()
        
        logger.info(f"Successfully saved {result['total_items']} menu items to database")
        return result
        
    except Exception as e:
        logger.error(f"Error saving menu to database: {str(e)}", exc_info=True)
        return {
            'success': False,
            'error': f"Failed to save to database: {str(e)}"
        }
