# 🔍 Authentication Debug Guide

## 🎯 **Issue Analysis**

The "Welcome Back" screen isn't showing up, which means the authentication state isn't being detected properly. Let's debug this step by step.

## 🧪 **Debug Steps**

### **Step 1: Check Authentication State**

1. **Visit the debug page:**
   ```
   http://192.168.1.2:3000/auth-test
   ```

2. **Check the following values:**
   - **Loading:** Should be "No" after page loads
   - **Authenticated:** Should show current auth state
   - **Has Wallet:** Shows if wallet exists in localStorage
   - **Current User:** Shows user data if authenticated
   - **API Auth Check:** Shows direct API response
   - **Browser Cookies:** Shows current cookies

### **Step 2: Test Authentication**

1. **Create Test Authentication:**
   - Click "Create Test Authentication" button
   - This simulates a logged-in user
   - Page will reload automatically

2. **Check Homepage:**
   - Go to `http://192.168.1.2:3000`
   - Should now show "Welcome Back" screen

3. **Clear Authentication:**
   - Click "Clear Authentication" button
   - This simulates a logged-out user
   - Page will reload automatically

## 🔧 **Possible Issues & Solutions**

### **Issue 1: No Auth Cookie**
**Symptoms:** API Auth Check shows 401 error
**Solution:** Use "Create Test Authentication" button

### **Issue 2: JWT Library Missing**
**Symptoms:** API Auth Check shows 500 error
**Solution:** Install jsonwebtoken:
```bash
npm install jsonwebtoken @types/jsonwebtoken
```

### **Issue 3: Context Not Updating**
**Symptoms:** Authenticated shows "No" even with valid cookie
**Solution:** Check WalletContext refreshAuth function

### **Issue 4: useEffect Not Triggering**
**Symptoms:** showAuthenticatedOptions never becomes true
**Solution:** Check dependency array in useEffect

## 🎯 **Expected Behavior**

### **When NOT Authenticated:**
```
Auth Test Page Shows:
- Authenticated: No
- API Auth Check: 401 error
- Cookies: No auth-token

Homepage Shows:
- Normal signup/login buttons
- No "Welcome Back" screen
```

### **When Authenticated:**
```
Auth Test Page Shows:
- Authenticated: Yes
- API Auth Check: 200 success with wallet_address
- Cookies: auth-token=jwt_token_here

Homepage Shows:
- "Welcome Back" screen with options
- "Go to Dashboard" and "Stay on Homepage" buttons
```

## 🔍 **Manual Debug Commands**

### **Check Cookies in Browser Console:**
```javascript
console.log('Cookies:', document.cookie);
```

### **Check Auth API Directly:**
```javascript
fetch('/api/auth/me', { credentials: 'include' })
  .then(r => r.json())
  .then(data => console.log('Auth check:', data));
```

### **Check Wallet Context:**
```javascript
// In React DevTools, find WalletProvider and check state
```

## 🚀 **Quick Fix Commands**

### **Create Test Auth (via curl):**
```bash
curl -X POST http://192.168.1.2:3000/api/auth/test-login \
  -H "Content-Type: application/json" \
  -d '{"wallet_address":"0x1234567890123456789012345678901234567890"}' \
  -c cookies.txt
```

### **Clear Auth (via curl):**
```bash
curl -X POST http://192.168.1.2:3000/api/auth/clear \
  -b cookies.txt
```

### **Check Auth (via curl):**
```bash
curl http://192.168.1.2:3000/api/auth/me \
  -b cookies.txt
```

## 📋 **Troubleshooting Checklist**

- [ ] Visit `/auth-test` page
- [ ] Check if "Authenticated" shows "Yes" or "No"
- [ ] Check if API Auth Check shows success or error
- [ ] Check if cookies contain "auth-token"
- [ ] Try "Create Test Authentication" button
- [ ] Visit homepage after creating test auth
- [ ] Check if "Welcome Back" screen appears
- [ ] Try "Clear Authentication" button
- [ ] Verify homepage shows normal buttons after clearing

## 🎯 **Next Steps**

1. **Visit the auth test page** to see current state
2. **Use the test buttons** to simulate different auth states
3. **Check the homepage** after each test
4. **Report findings** - what shows up in each section

This will help us identify exactly where the authentication flow is breaking down!