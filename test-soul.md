# Escape Test SOUL

## Description
A test SOUL for verifying JSON escaping of special characters including "quotes", 'apostrophes', and newlines.

## Content

This SOUL tests various special characters that need proper JSON escaping:

### Quotes and Apostrophes
- Double quotes: "Hello World"
- Single quotes: It's working fine
- Mixed: "It's a test", she said

### Newlines
Line 1
Line 2
Line 3

### Backslashes
Windows path: C:\Users\Agent\Files
Regex: \d+\.\d+

### JSON Content
Here's some JSON that needs escaping:
```json
{
  "name": "value",
  "nested": {
    "key": "It's \"quoted\""
  }
}
```

### Special Characters
- Unicode: ñ, ü, é, 中文
- Symbols: @#$%^&*()
- Emoji: 🚀 🎉 ✅

### Code Blocks
```python
def test():
    print("Hello \"World\"")
    return True
```

This ensures all special characters are properly escaped when uploading via the SDK.
