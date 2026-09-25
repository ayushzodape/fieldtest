import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://demo.fieldtest.supabase.co";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "demo-anon-key";

export const isSupabaseConfigured = Boolean(
  process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

if (!isSupabaseConfigured) {
  console.info(
    "[FieldTest] Supabase environment variables not configured. Operating in offline/demo mode."
  );
}

// Universal storage adapter that works seamlessly across React Native, Web, and Node test runtimes
const memoryStorage = new Map<string, string>();
const storageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    if (typeof navigator === "undefined" || (navigator as { product?: string }).product !== "ReactNative") {
      return memoryStorage.get(key) ?? null;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const AsyncStorage = require("@react-native-async-storage/async-storage").default || require("@react-native-async-storage/async-storage");
      return AsyncStorage.getItem(key);
    } catch {
      return memoryStorage.get(key) ?? null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, value);
      return;
    }
    if (typeof navigator === "undefined" || (navigator as { product?: string }).product !== "ReactNative") {
      memoryStorage.set(key, value);
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const AsyncStorage = require("@react-native-async-storage/async-storage").default || require("@react-native-async-storage/async-storage");
      await AsyncStorage.setItem(key, value);
    } catch {
      memoryStorage.set(key, value);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(key);
      return;
    }
    if (typeof navigator === "undefined" || (navigator as { product?: string }).product !== "ReactNative") {
      memoryStorage.delete(key);
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const AsyncStorage = require("@react-native-async-storage/async-storage").default || require("@react-native-async-storage/async-storage");
      await AsyncStorage.removeItem(key);
    } catch {
      memoryStorage.delete(key);
    }
  },
};

const isWeb = typeof window !== "undefined";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: isWeb,
  },
});

