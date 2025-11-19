import requests
import sys
import json
from datetime import datetime
import os

class MealPlanTrackerAPITester:
    def __init__(self, base_url="https://menu-time-sync.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, passed, message="", response_data=None):
        """Log test result"""
        self.tests_run += 1
        if passed:
            self.tests_passed += 1
            print(f"✅ {name}: PASSED")
        else:
            print(f"❌ {name}: FAILED - {message}")
        
        self.test_results.append({
            "test": name,
            "passed": passed,
            "message": message,
            "response": response_data
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        default_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            default_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            default_headers.update(headers)
        
        # Remove Content-Type for file uploads
        if files:
            default_headers.pop('Content-Type', None)
        
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        print(f"   Method: {method}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers, timeout=30)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, headers=default_headers, timeout=30)
                else:
                    response = requests.post(url, json=data, headers=default_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=default_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=default_headers, timeout=30)

            print(f"   Status: {response.status_code}")
            
            success = response.status_code == expected_status
            
            try:
                response_json = response.json()
            except:
                response_json = {"raw": response.text}
            
            if success:
                self.log_test(name, True, response_data=response_json)
                return True, response_json
            else:
                self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}", response_json)
                return False, response_json

        except requests.exceptions.Timeout:
            self.log_test(name, False, "Request timeout")
            return False, {}
        except Exception as e:
            self.log_test(name, False, f"Error: {str(e)}")
            return False, {}

    def test_root(self):
        """Test root endpoint"""
        success, response = self.run_test(
            "Root Endpoint",
            "GET",
            "",
            200
        )
        return success

    def test_signup(self):
        """Test user signup"""
        timestamp = datetime.now().strftime('%H%M%S')
        signup_data = {
            "name": f"Test User {timestamp}",
            "email": f"test{timestamp}@example.com",
            "password": "TestPass123!",
            "meal_plan_amount": 500.00
        }
        
        success, response = self.run_test(
            "User Signup",
            "POST",
            "auth/signup",
            200,
            data=signup_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            print(f"   ✓ Token received: {self.token[:20]}...")
            print(f"   ✓ User ID: {self.user_id}")
            return True
        return False

    def test_login(self):
        """Test user login with existing credentials"""
        # Use the same credentials from signup
        timestamp = datetime.now().strftime('%H%M%S')
        login_data = {
            "email": f"test{timestamp}@example.com",
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'token' in response:
            print(f"   ✓ Login successful")
            return True
        return False

    def test_get_me(self):
        """Test get current user"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        
        if success:
            print(f"   ✓ User data retrieved: {response.get('name', 'N/A')}")
            return True
        return False

    def test_get_receipts(self):
        """Test get receipts"""
        success, response = self.run_test(
            "Get Receipts",
            "GET",
            "receipts",
            200
        )
        
        if success:
            print(f"   ✓ Receipts count: {len(response) if isinstance(response, list) else 0}")
            return True
        return False

    def test_get_transactions(self):
        """Test get transactions"""
        success, response = self.run_test(
            "Get Transactions",
            "GET",
            "transactions",
            200
        )
        
        if success:
            print(f"   ✓ Transactions count: {len(response) if isinstance(response, list) else 0}")
            return True
        return False

    def test_get_transaction_history(self):
        """Test get transaction history"""
        success, response = self.run_test(
            "Get Transaction History",
            "GET",
            "transactions/history",
            200
        )
        
        if success:
            print(f"   ✓ Total transactions: {response.get('total', 0)}")
            return True
        return False

    def test_get_analytics(self):
        """Test get analytics"""
        success, response = self.run_test(
            "Get Analytics",
            "GET",
            "analytics",
            200
        )
        
        if success:
            print(f"   ✓ Total spent: ${response.get('total_spent', 0)}")
            print(f"   ✓ Transactions count: {response.get('transactions_count', 0)}")
            print(f"   ✓ Categories: {list(response.get('spending_by_category', {}).keys())}")
            return True
        return False

    def test_get_menu(self):
        """Test get menu"""
        success, response = self.run_test(
            "Get Menu",
            "GET",
            "menu",
            200
        )
        
        if success:
            print(f"   ✓ Menu items count: {len(response) if isinstance(response, list) else 0}")
            return True
        return False

    def test_create_menu_item(self):
        """Test create menu item"""
        menu_data = {
            "name": "Test Coffee",
            "category": "drinks",
            "price": 3.50,
            "description": "Test coffee item"
        }
        
        success, response = self.run_test(
            "Create Menu Item",
            "POST",
            "menu",
            200,
            data=menu_data
        )
        
        if success:
            print(f"   ✓ Menu item created: {response.get('name', 'N/A')}")
            return True
        return False

    def test_cafe_menu_public(self):
        """Test public cafe menu endpoint (no auth required)"""
        success, response = self.run_test(
            "Get Cafe Menu (Public)",
            "GET",
            "cafe-menu",
            200
        )
        
        if success:
            print(f"   ✓ Display mode: {response.get('display_mode', 'N/A')}")
            print(f"   ✓ Date: {response.get('date', 'N/A')}")
            print(f"   ✓ Current time: {response.get('current_time', 'N/A')}")
            menu = response.get('menu', {})
            total_items = sum(len(items) for items in menu.values() if isinstance(items, list))
            print(f"   ✓ Total menu items: {total_items}")
            return True
        return False

    def test_cafe_menu_all(self):
        """Test get all cafe menu items (requires auth)"""
        success, response = self.run_test(
            "Get All Cafe Menu Items",
            "GET",
            "cafe-menu/all",
            200
        )
        
        if success:
            items = response.get('items', [])
            print(f"   ✓ Total items: {response.get('count', 0)}")
            print(f"   ✓ Items array length: {len(items)}")
            if items:
                print(f"   ✓ Sample item: {items[0].get('name', 'N/A')} at {items[0].get('station', 'N/A')}")
            return True
        return False

    def test_admin_scrape_menu(self):
        """Test manual menu scraping (admin only)"""
        print(f"\n🔍 Testing Manual Menu Scraping (Admin)...")
        print(f"   URL: {self.base_url}/admin/scrape-menu")
        print(f"   Method: POST")
        print(f"   ⚠️  This may take 10-15 seconds to scrape from live website...")
        
        success, response = self.run_test(
            "Manual Menu Scraping",
            "POST",
            "admin/scrape-menu",
            200
        )
        
        if success:
            print(f"   ✓ Scraping successful: {response.get('success', False)}")
            print(f"   ✓ Total items scraped: {response.get('total_items', 0)}")
            if response.get('menu'):
                menu = response['menu']
                print(f"   ✓ Breakfast items: {len(menu.get('breakfast', []))}")
                print(f"   ✓ Lunch items: {len(menu.get('lunch', []))}")
                print(f"   ✓ Dinner items: {len(menu.get('dinner', []))}")
            return True
        return False

    def test_admin_scraper_settings_get(self):
        """Test get scraper settings (admin only)"""
        success, response = self.run_test(
            "Get Scraper Settings",
            "GET",
            "admin/scraper-settings",
            200
        )
        
        if success:
            print(f"   ✓ Auto scrape enabled: {response.get('auto_scrape_enabled', 'N/A')}")
            print(f"   ✓ Scrape time: {response.get('scrape_time', 'N/A')}")
            print(f"   ✓ Last scrape date: {response.get('last_scrape_date', 'N/A')}")
            print(f"   ✓ Items count: {response.get('items_count', 0)}")
            return True
        return False

    def test_admin_scraper_settings_update(self):
        """Test update scraper settings (admin only)"""
        settings_data = {
            "auto_scrape_enabled": True,
            "scrape_time": "04:00"
        }
        
        success, response = self.run_test(
            "Update Scraper Settings",
            "POST",
            "admin/scraper-settings",
            200,
            data=settings_data
        )
        
        if success:
            print(f"   ✓ Settings updated: {response.get('success', False)}")
            print(f"   ✓ Message: {response.get('message', 'N/A')}")
            return True
        return False

    def test_admin_cafe_items_table(self):
        """Test get cafe items table (admin only)"""
        success, response = self.run_test(
            "Get Cafe Items Table",
            "GET",
            "admin/cafe-items-table",
            200
        )
        
        if success:
            items = response.get('items', [])
            print(f"   ✓ Unique items count: {response.get('count', 0)}")
            print(f"   ✓ Items array length: {len(items)}")
            if items:
                sample_item = items[0]
                print(f"   ✓ Sample item: {sample_item.get('name', 'N/A')}")
                print(f"   ✓ Station: {sample_item.get('station', 'N/A')}")
                print(f"   ✓ Meal periods: {sample_item.get('meal_periods', [])}")
                print(f"   ✓ Dietary tags: {sample_item.get('dietary_tags', [])}")
            return True
        return False

    def test_health_check(self):
        """Test health check endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "health",
            200
        )
        
        if success:
            print(f"   ✓ Status: {response.get('status', 'N/A')}")
            print(f"   ✓ Database: {response.get('database', 'N/A')}")
            print(f"   ✓ Version: {response.get('version', 'N/A')}")
            return True
        return False

    def test_receipt_upload_without_file(self):
        """Test receipt upload endpoint without file (should fail)"""
        print(f"\n🔍 Testing Receipt Upload Without File...")
        print(f"   URL: {self.base_url}/receipts/upload")
        print(f"   Method: POST")
        
        try:
            headers = {'Authorization': f'Bearer {self.token}'}
            response = requests.post(
                f"{self.base_url}/receipts/upload",
                headers=headers,
                timeout=30
            )
            
            print(f"   Status: {response.status_code}")
            
            # Should return 422 (validation error) without file
            if response.status_code == 422:
                self.log_test("Receipt Upload Without File", True, "Correctly rejected request without file")
                return True
            else:
                self.log_test("Receipt Upload Without File", False, f"Expected 422, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Receipt Upload Without File", False, f"Error: {str(e)}")
            return False

    def test_ocr_receipt_extraction(self):
        """Test OCR receipt extraction with specific receipt image"""
        print(f"\n🔍 Testing OCR Receipt Extraction with Actual Receipt...")
        print(f"   URL: {self.base_url}/receipts/preview")
        print(f"   Method: POST")
        print(f"   ⚠️  This may take 10-15 seconds for OCR processing...")
        
        # Receipt image URL provided by user
        receipt_image_url = "https://customer-assets.emergentagent.com/job_menu-time-sync/artifacts/tbiqqw5y_IMG_6994.jpeg"
        
        # Expected values from the receipt
        expected_values = {
            "merchant": "Maker's Cafe @ CCA",
            "date": "2025-11-19",
            "time": "12:20",
            "total": 13.24,
            "remaining_balance": 731.38,
            "items": [{"name": "Grilled Tofu", "price": 12.49}]
        }
        
        try:
            # Download the image first
            print(f"   📥 Downloading receipt image from: {receipt_image_url}")
            image_response = requests.get(receipt_image_url, timeout=30)
            if image_response.status_code != 200:
                self.log_test("OCR Receipt Extraction", False, f"Failed to download image: {image_response.status_code}")
                return False
            
            # Prepare the file for upload
            files = {
                'file': ('receipt.jpg', image_response.content, 'image/jpeg')
            }
            
            headers = {'Authorization': f'Bearer {self.token}'}
            
            response = requests.post(
                f"{self.base_url}/receipts/preview",
                files=files,
                headers=headers,
                timeout=60  # Longer timeout for OCR processing
            )
            
            print(f"   Status: {response.status_code}")
            
            if response.status_code != 200:
                try:
                    error_data = response.json()
                    self.log_test("OCR Receipt Extraction", False, f"API Error: {error_data.get('detail', 'Unknown error')}")
                except:
                    self.log_test("OCR Receipt Extraction", False, f"HTTP {response.status_code}: {response.text[:200]}")
                return False
            
            try:
                response_data = response.json()
            except:
                self.log_test("OCR Receipt Extraction", False, "Invalid JSON response")
                return False
            
            # Check if the response has the expected structure
            if not response_data.get('success'):
                self.log_test("OCR Receipt Extraction", False, "Response indicates failure")
                return False
            
            preview_data = response_data.get('preview_data', {})
            if not preview_data:
                self.log_test("OCR Receipt Extraction", False, "No preview_data in response")
                return False
            
            print(f"   📊 OCR Results:")
            print(f"      Merchant: {preview_data.get('merchant', 'N/A')}")
            print(f"      Date: {preview_data.get('date', 'N/A')}")
            print(f"      Time: {preview_data.get('time', 'N/A')}")
            print(f"      Total: ${preview_data.get('total', 0)}")
            print(f"      Remaining Balance: ${preview_data.get('remaining_balance', 0)}")
            print(f"      Items: {len(preview_data.get('items', []))}")
            
            # Validate extracted data against expected values
            validation_results = []
            
            # Check merchant
            extracted_merchant = preview_data.get('merchant', '').lower()
            expected_merchant = expected_values['merchant'].lower()
            if expected_merchant in extracted_merchant or extracted_merchant in expected_merchant:
                validation_results.append(("Merchant", True, f"✓ {preview_data.get('merchant')}"))
            else:
                validation_results.append(("Merchant", False, f"✗ Expected '{expected_values['merchant']}', got '{preview_data.get('merchant')}'"))
            
            # Check date
            extracted_date = preview_data.get('date')
            if extracted_date == expected_values['date']:
                validation_results.append(("Date", True, f"✓ {extracted_date}"))
            else:
                validation_results.append(("Date", False, f"✗ Expected '{expected_values['date']}', got '{extracted_date}'"))
            
            # Check time
            extracted_time = preview_data.get('time')
            if extracted_time == expected_values['time']:
                validation_results.append(("Time", True, f"✓ {extracted_time}"))
            else:
                validation_results.append(("Time", False, f"✗ Expected '{expected_values['time']}', got '{extracted_time}'"))
            
            # Check total (allow small floating point differences)
            extracted_total = float(preview_data.get('total', 0))
            expected_total = expected_values['total']
            if abs(extracted_total - expected_total) < 0.01:
                validation_results.append(("Total", True, f"✓ ${extracted_total}"))
            else:
                validation_results.append(("Total", False, f"✗ Expected ${expected_total}, got ${extracted_total}"))
            
            # Check remaining balance (CRITICAL - this was the main issue)
            extracted_balance = float(preview_data.get('remaining_balance', 0))
            expected_balance = expected_values['remaining_balance']
            if abs(extracted_balance - expected_balance) < 0.01:
                validation_results.append(("Remaining Balance", True, f"✓ ${extracted_balance}"))
            else:
                validation_results.append(("Remaining Balance", False, f"✗ Expected ${expected_balance}, got ${extracted_balance}"))
            
            # Check items (at least one item with Grilled Tofu)
            items = preview_data.get('items', [])
            grilled_tofu_found = False
            for item in items:
                if 'grilled tofu' in item.get('name', '').lower():
                    grilled_tofu_found = True
                    item_price = float(item.get('price', 0))
                    if abs(item_price - 12.49) < 0.01:
                        validation_results.append(("Items", True, f"✓ Found Grilled Tofu at ${item_price}"))
                    else:
                        validation_results.append(("Items", False, f"✗ Found Grilled Tofu but price ${item_price} != $12.49"))
                    break
            
            if not grilled_tofu_found:
                validation_results.append(("Items", False, f"✗ Grilled Tofu not found in items: {[item.get('name') for item in items]}"))
            
            # Print validation results
            print(f"   🔍 Validation Results:")
            passed_validations = 0
            total_validations = len(validation_results)
            
            for field, passed, message in validation_results:
                print(f"      {message}")
                if passed:
                    passed_validations += 1
            
            # Overall test result
            overall_success = passed_validations == total_validations
            
            if overall_success:
                self.log_test("OCR Receipt Extraction", True, f"All {total_validations} validations passed", response_data)
                print(f"   🎉 OCR extraction working perfectly!")
            else:
                failed_count = total_validations - passed_validations
                self.log_test("OCR Receipt Extraction", False, f"{failed_count}/{total_validations} validations failed", response_data)
                print(f"   ⚠️  {failed_count} validation(s) failed")
            
            return overall_success
                
        except requests.exceptions.Timeout:
            self.log_test("OCR Receipt Extraction", False, "Request timeout during OCR processing")
            return False
        except Exception as e:
            self.log_test("OCR Receipt Extraction", False, f"Error: {str(e)}")
            return False

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print("📊 TEST SUMMARY")
        print("="*60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        print("="*60)
        
        # Print failed tests
        failed_tests = [t for t in self.test_results if not t['passed']]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['message']}")
        
        return self.tests_passed == self.tests_run

def main():
    print("="*60)
    print("🧪 MEAL PLAN TRACKER API TEST SUITE")
    print("="*60)
    
    tester = MealPlanTrackerAPITester()
    
    # Run tests in order
    print("\n📋 HEALTH & BASIC TESTS")
    print("-"*60)
    tester.test_root()
    tester.test_health_check()
    
    print("\n📋 AUTHENTICATION TESTS")
    print("-"*60)
    if not tester.test_signup():
        print("\n❌ Signup failed - cannot continue with authenticated tests")
        tester.print_summary()
        return 1
    
    tester.test_get_me()
    
    print("\n📋 CAFE MENU TESTS (PUBLIC)")
    print("-"*60)
    tester.test_cafe_menu_public()
    
    print("\n📋 CAFE MENU TESTS (AUTHENTICATED)")
    print("-"*60)
    tester.test_cafe_menu_all()
    
    print("\n📋 ADMIN CAFE MENU TESTS")
    print("-"*60)
    print("⚠️  Note: These tests require admin privileges (first user is auto-admin)")
    tester.test_admin_scraper_settings_get()
    tester.test_admin_scrape_menu()  # This will populate the database
    tester.test_admin_scraper_settings_update()
    tester.test_admin_cafe_items_table()
    
    print("\n📋 RECEIPT & TRANSACTION TESTS")
    print("-"*60)
    tester.test_get_receipts()
    tester.test_get_transactions()
    tester.test_get_transaction_history()
    tester.test_receipt_upload_without_file()
    
    print("\n📋 ANALYTICS TESTS")
    print("-"*60)
    tester.test_get_analytics()
    
    print("\n📋 MENU TESTS")
    print("-"*60)
    tester.test_get_menu()
    tester.test_create_menu_item()
    
    # Print summary
    all_passed = tester.print_summary()
    
    # Save results to file
    results_file = "/app/backend_test_results.json"
    with open(results_file, 'w') as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "total_tests": tester.tests_run,
            "passed": tester.tests_passed,
            "failed": tester.tests_run - tester.tests_passed,
            "success_rate": f"{(tester.tests_passed/tester.tests_run*100):.1f}%",
            "results": tester.test_results
        }, f, indent=2)
    
    print(f"\n📄 Results saved to: {results_file}")
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())
