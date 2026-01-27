/**
 * Account Service
 *
 * Local account management for the research study.
 * Provides a Firebase-ready interface but stores locally for the MVP.
 *
 * Note: For production with Firebase auth, replace the implementation
 * while keeping the same interface.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants';

/**
 * User profile structure
 */
export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Account service interface (Firebase-compatible)
 */
export interface IAccountService {
  isAuthenticated(): Promise<boolean>;
  getCurrentUser(): Promise<UserProfile | null>;
  createAccount(profile: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserProfile>;
  updateProfile(updates: Partial<UserProfile>): Promise<UserProfile>;
  deleteAccount(): Promise<void>;
}

class LocalAccountService implements IAccountService {
  private profile: UserProfile | null = null;
  private initialized = false;

  /**
   * Initialize by loading profile from storage
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.ACCOUNT_PROFILE);
      if (data) {
        this.profile = JSON.parse(data);
      }
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize account service:', error);
      this.initialized = true;
    }
  }

  /**
   * Generate a local user ID
   */
  private generateId(): string {
    return `local_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Check if user is authenticated (has a profile)
   */
  async isAuthenticated(): Promise<boolean> {
    await this.initialize();
    return this.profile !== null;
  }

  /**
   * Get the current user profile
   */
  async getCurrentUser(): Promise<UserProfile | null> {
    await this.initialize();
    return this.profile;
  }

  /**
   * Create a new account
   */
  async createAccount(
    profile: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<UserProfile> {
    const now = new Date().toISOString();

    this.profile = {
      ...profile,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
    };

    await AsyncStorage.setItem(STORAGE_KEYS.ACCOUNT_PROFILE, JSON.stringify(this.profile));
    return this.profile;
  }

  /**
   * Update the user profile
   */
  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    await this.initialize();

    if (!this.profile) {
      throw new Error('No account exists. Create an account first.');
    }

    this.profile = {
      ...this.profile,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(STORAGE_KEYS.ACCOUNT_PROFILE, JSON.stringify(this.profile));
    return this.profile;
  }

  /**
   * Delete the account
   */
  async deleteAccount(): Promise<void> {
    this.profile = null;
    this.initialized = false;
    await AsyncStorage.removeItem(STORAGE_KEYS.ACCOUNT_PROFILE);
  }
}

/**
 * Singleton instance of the account service
 */
export const AccountService = new LocalAccountService();
