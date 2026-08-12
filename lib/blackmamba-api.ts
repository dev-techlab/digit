import crypto from 'node:crypto';

export const BLACKMAMBA_API_URL = 'https://api.blackmamba.mobi/ashx/CheckAccount.ashx';

/**
 * Generate the authentication token for Blackmamba API requests.
 * signature=MD5(keyAgent+ApiKey+time).ToUpper
 */
function generateToken(keyAgent: string, apiKey: string, time: string): string {
  const rawString = `${keyAgent}${apiKey}${time}`;
  return crypto.createHash('md5').update(rawString).digest('hex').toUpperCase();
}

/**
 * Centralized fetch helper for Blackmamba API requests.
 */
async function fetchBlackmamba<T = any>(
  action: string,
  keyAgent: string,
  apiKey: string,
  extraParams: Record<string, string | number | undefined>
): Promise<T> {
  const time = Date.now().toString();
  const token = generateToken(keyAgent, apiKey, time);
  const ts = Math.random().toString();

  const params = new URLSearchParams();
  params.append('action', action);
  params.append('keyAgent', keyAgent);
  params.append('time', time);
  params.append('token', token);
  params.append('ts', ts);

  for (const [key, value] of Object.entries(extraParams)) {
    if (value !== undefined) {
      params.append(key, value.toString());
    }
  }

  // The documentation recommends POST
  const response = await fetch(`${BLACKMAMBA_API_URL}?${params.toString()}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!response.ok) {
    throw new Error(`Blackmamba API HTTP error: ${response.status}`);
  }

  const data = await response.json();

  if (data.code !== 0) {
    throw new Error(`Blackmamba action '${action}' failed: ${data.msg} (Code: ${data.code})`);
  }

  return data as T;
}

export interface BaseResponse {
  code: number;
  msg: string;
  success: boolean;
}

export interface CreatePlayerInput {
  agent: string; // The player's superior Agent account
  userPwd?: string; // Player's login password (max 15 chars)
  scoreNum?: number; // Initial score
}

export interface CreatePlayerResponse extends BaseResponse {
  account: string;
  password?: string;
}

/**
 * 1. Creates a player account in the background on the Blackmamba platform.
 */
export async function createBlackmambaPlayer(
  input: CreatePlayerInput,
  keyAgent: string,
  apiKey: string
): Promise<CreatePlayerResponse> {
  const extraParams: Record<string, string | number> = { agent: input.agent };
  if (input.userPwd) extraParams.userPwd = input.userPwd.slice(0, 15);
  if (input.scoreNum !== undefined && input.scoreNum >= 0) extraParams.scoreNum = input.scoreNum;

  return fetchBlackmamba<CreatePlayerResponse>('addUser', keyAgent, apiKey, extraParams);
}

export interface ChangeScoreResponse extends BaseResponse {
  account: string;
  scoreNum: string;
}

/**
 * 2.1 Increase/Decrease Player's ENTRIES
 */
export async function changePlayerEntries(
  account: string,
  scoreNum: number,
  orderId: string,
  keyAgent: string,
  apiKey: string,
  agent?: string
): Promise<ChangeScoreResponse> {
  if (orderId.length > 25) throw new Error('orderId must be 25 characters or fewer');
  return fetchBlackmamba<ChangeScoreResponse>('setEntries', keyAgent, apiKey, {
    account,
    scoreNum,
    orderId,
    agent,
  });
}

/**
 * 2.2 Increase/Decrease Player's WINNING
 */
export async function changePlayerWinning(
  account: string,
  scoreNum: number,
  orderId: string,
  keyAgent: string,
  apiKey: string,
  agent?: string
): Promise<ChangeScoreResponse> {
  if (orderId.length > 25) throw new Error('orderId must be 25 characters or fewer');
  return fetchBlackmamba<ChangeScoreResponse>('setWinning', keyAgent, apiKey, {
    account,
    scoreNum,
    orderId,
    agent,
  });
}

/**
 * 2.3 Reset Player's Score
 */
export async function clearPlayerScore(
  account: string,
  keyAgent: string,
  apiKey: string,
  agent?: string
): Promise<ChangeScoreResponse> {
  return fetchBlackmamba<ChangeScoreResponse>('clearScore', keyAgent, apiKey, { account, agent });
}

/**
 * 2.4 Special Bonus Points
 */
export async function setPlayerSpecial(
  account: string,
  scoreNum: number,
  orderId: string,
  keyAgent: string,
  apiKey: string,
  agent?: string
): Promise<ChangeScoreResponse> {
  if (orderId.length > 25) throw new Error('orderId must be 25 characters or fewer');
  return fetchBlackmamba<ChangeScoreResponse>('setSpecial', keyAgent, apiKey, {
    account,
    scoreNum,
    orderId,
    agent,
  });
}

export interface GetPlayerInfoResponse extends BaseResponse {
  account: string;
  agent: string;
  entries: string;
  id: number;
  name: string;
  state: number;
  totalPay: string;
  winning: string;
  isFirstPay: number;
}

/**
 * 3. Validate Player Account and Return Basic Score Information
 */
export async function getPlayerInfo(
  account: string,
  userPwd: string,
  keyAgent: string,
  apiKey: string
): Promise<GetPlayerInfoResponse> {
  return fetchBlackmamba<GetPlayerInfoResponse>('getUserInfo', keyAgent, apiKey, {
    account,
    userPwd,
  });
}

export interface ResetPasswordResponse extends BaseResponse {
  pwd?: string;
}

/**
 * 4. Reset Player's Password
 */
export async function resetPlayerPassword(
  account: string,
  userPwd: string, // new password, 6-15 chars
  keyAgent: string,
  apiKey: string
): Promise<ResetPasswordResponse> {
  if (userPwd.length < 6) throw new Error('Password must be at least 6 characters');
  return fetchBlackmamba<ResetPasswordResponse>('resetUserPwd', keyAgent, apiKey, {
    account,
    userPwd: userPwd.slice(0, 15),
  });
}

export interface GetAgentScoreResponse extends BaseResponse {
  maxScore: string;
}

/**
 * 5. Get Current Player's Rechargeable Credit (Agent Score)
 */
export async function getAgentScoreForPlayer(
  account: string,
  keyAgent: string,
  apiKey: string
): Promise<GetAgentScoreResponse> {
  return fetchBlackmamba<GetAgentScoreResponse>('getAgentScore', keyAgent, apiKey, { account });
}

/**
 * 6. Implement One-Click Automatic Player Login via URL
 * Generates the URL for seamless player login.
 */
export function getPlayerLoginUrl(acc: string, pw: string): string {
  // pw should be the 32-bit MD5 hash of the player's login password.
  const hashedPw = crypto.createHash('md5').update(pw).digest('hex').toUpperCase();
  return `https://blackmamba.mobi/?acc=${encodeURIComponent(acc)}&pw=${encodeURIComponent(hashedPw)}`;
}

export interface ScoreLogResult {
  Account: string;
  ActionIP: string;
  Action_Type: number;
  AfterNum: string;
  C_DateTime: string;
  Index_NO: number;
  OrderId: string;
  Rownum: number;
  ScoreNum: string;
  UserName: string;
}

export interface GetScoreLogResponse extends BaseResponse {
  dbScoreNum: string;
  dbcount: number;
  fOrderId: string;
  ftime: number;
  psize: number;
  rdAll: number;
  rdDel: number;
  rdScoreNum: string;
  rdTotalCount: number;
  redissize: number;
  results: ScoreLogResult[];
  total: number;
  totalScore: string;
  totalSum: string;
  useredis: number;
}

/**
 * 7. Get Player's Score Log for the Last 7 Days
 */
export async function getPlayerScoreLog(
  account: string,
  pageIndex: number,
  keyAgent: string,
  apiKey: string,
  pageSize?: number
): Promise<GetScoreLogResponse> {
  return fetchBlackmamba<GetScoreLogResponse>('getScoreLog', keyAgent, apiKey, {
    account,
    pageIndex,
    pageSize,
  });
}

export interface GetSkeyUrlResponse extends BaseResponse {
  id: number;
  url: string;
}

/**
 * 8. Get Login and Registration URL
 */
export async function getRegistrationUrl(
  agent: string,
  keyAgent: string,
  apiKey: string
): Promise<GetSkeyUrlResponse> {
  return fetchBlackmamba<GetSkeyUrlResponse>('getSkeyUrl', keyAgent, apiKey, { agent });
}

export interface GetAgentBalanceResponse extends BaseResponse {
  score: number;
  agent: string;
}

/**
 * 9. Check Agent Account Balance
 */
export async function getAgentBalance(
  agent: string,
  keyAgent: string,
  apiKey: string
): Promise<GetAgentBalanceResponse> {
  return fetchBlackmamba<GetAgentBalanceResponse>('getAgentBalance', keyAgent, apiKey, { agent });
}

export interface ChangeAgentScoreResponse extends BaseResponse {
  agentScore: string;
  order: string;
  agent: string;
  scoreNum: string;
}

/**
 * 10. Set Agent to Add or Subtract Score
 */
export async function changeAgentScore(
  agent: string,
  scoreNum: number,
  keyAgent: string,
  apiKey: string
): Promise<ChangeAgentScoreResponse> {
  return fetchBlackmamba<ChangeAgentScoreResponse>('setAgentScore', keyAgent, apiKey, {
    agent,
    scoreNum,
  });
}

export interface CheckAgentInfoResponse extends BaseResponse {}

/**
 * 11. Check Agent Password
 */
export async function checkAgentPassword(
  agent: string,
  agentPwd: string, // raw password to hash
  keyAgent: string,
  apiKey: string
): Promise<CheckAgentInfoResponse> {
  // MD5 value of agent account password
  // Based on the example in the PDF, this should be lowercase.
  const hashedPw = crypto.createHash('md5').update(agentPwd).digest('hex').toLowerCase();
  return fetchBlackmamba<CheckAgentInfoResponse>('checkAgentInfo', keyAgent, apiKey, {
    agent,
    agentPwd: hashedPw,
  });
}
