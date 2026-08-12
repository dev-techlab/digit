# Blackmamba API Integration

This document outlines the API endpoints and integration flow for the Blackmamba game provider, mapping game events (like user creation and score updates) to the correct API calls based on the provided documentation.

## Base Information

- **API Endpoint**: `https://api.blackmamba.mobi/ashx/CheckAccount.ashx`
- **Supported Methods**: POST, GET (POST is recommended)

## Authentication

Authentication is required for all requests using the following parameters:

- `keyAgent`: The authorized operator agent account.
- `token`: An MD5 hash of `keyAgent + ApiKey + time` converted to uppercase. Example: `MD5(keyAgent+ApiKey+time).ToUpper()`
- `time`: A 13-digit timestamp (Unix timestamp in milliseconds).
- `ts`: A random number (Optional).

---

## Event Mapping & API Endpoints

### 1. Add Player Account (User Create)

**Event**: Triggered when a new user signs up or is created in the background.

- **action**: `addUser`
- **Required Parameters**: `action`, `keyAgent`, `agent` (superior agent account), `time`, `token`
- **Optional Parameters**:
  - `userPwd`: Password (max 15 chars). If omitted, a random password is generated.
  - `scoreNum`: Initial score to add to the registered player.

### 2. Change Player Score (Background Player Score Change)

**Event**: Triggered when increasing or decreasing a player's score. Requires an `orderId` to prevent duplicate requests.

#### 2.1 Increase/Decrease Player's ENTRIES

- **action**: `setEntries`
- **Required Parameters**: `action`, `keyAgent`, `account`, `scoreNum` (+ for increase, - for decrease), `orderId` (within 25 chars), `time`, `token`
- **Optional Parameters**: `agent` (must be direct agent if passed).

#### 2.2 Increase/Decrease Player's WINNING

- **action**: `setWinning`
- **Required Parameters**: `action`, `keyAgent`, `account`, `scoreNum` (+ for increase, - for decrease), `orderId` (within 25 chars), `time`, `token`
- **Optional Parameters**: `agent`

#### 2.3 Reset Player's Score

- **action**: `clearScore`
- **Required Parameters**: `action`, `keyAgent`, `account`, `time`, `token`
- **Optional Parameters**: `agent`

#### 2.4 Special Bonus Points

- **action**: `setSpecial`
- **Required Parameters**: `action`, `keyAgent`, `account`, `scoreNum`, `orderId`, `time`, `token`
- **Optional Parameters**: `agent`

### 3. Validate Player Account and Return Basic Score Information

**Event**: Check player status, deposit/winning amounts, or verify credentials.

- **action**: `getUserInfo`
- **Required Parameters**: `action`, `keyAgent`, `account`, `userPwd`, `time`, `token`

### 4. Reset Player's Password

**Event**: Player requests a password reset.

- **action**: `resetUserPwd`
- **Required Parameters**: `action`, `keyAgent`, `account`, `userPwd` (new password, 6-15 chars), `time`, `token`

### 5. Get Current Player's Rechargeable Credit (Agent Score)

**Event**: Check available points on the agent account before deducting player points.

- **action**: `getAgentScore`
- **Required Parameters**: `action`, `keyAgent`, `account`, `time`, `token`

### 6. Implement One-Click Automatic Player Login via URL

**Event**: Seamless login for players clicking a link.

- **Endpoint**: `https://blackmamba.mobi/`
- **Required Parameters**:
  - `acc`: Player's game account.
  - `pw`: 32-bit MD5 hash of the player's login password.

### 7. Get Player's Score Log for the Last 7 Days

**Event**: Retrieving history for the player.

- **action**: `getScoreLog`
- **Required Parameters**: `action`, `keyAgent`, `account`, `pageIndex`, `time`, `token`
- **Optional Parameters**: `pageSize` (default 20)

### 8. Get Login and Registration URL

**Event**: Redirecting a user to register/login.

- **action**: `getSkeyUrl`
- **Required Parameters**: `action`, `keyAgent`, `agent`, `time`, `token`

### 9. Check Agent Account Balance

**Event**: Verifying agent balance.

- **action**: `getAgentBalance`
- **Required Parameters**: `action`, `keyAgent`, `agent`, `time`, `token`

### 10. Set Agent to Add or Subtract Score

**Event**: Modifying agent score limits.

- **action**: `setAgentScore`
- **Required Parameters**: `action`, `keyAgent`, `agent`, `scoreNum` (+ or -), `time`, `token`

### 11. Check Agent Password

**Event**: Verifying agent access.

- **action**: `checkAgentInfo`
- **Required Parameters**: `action`, `keyAgent`, `agent`, `agentPwd` (MD5 value of password), `time`, `token`

---

## Standard Response Codes

- `0`: Success
- `-10`: Incorrect action
- `-99`: Token signature error
- `-101`: Incorrect player/agent account
- `-10001`: Request too frequent
- `-10002`: Network connection failure
- `-120`: Interface/API exception
