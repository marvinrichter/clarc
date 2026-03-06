---
name: react-native-patterns
description: "React Native patterns: navigation (Expo Router), platform-specific code, local storage, push notifications (Expo), performance optimization, network handling, and bridging native APIs. For Expo-based React Native apps."
origin: ECC
---

# React Native Patterns Skill

## When to Activate

- Building a cross-platform mobile app (iOS + Android)
- Adding navigation, deep links, or tab structure
- Persisting data locally on device
- Implementing push notifications
- Debugging performance issues (re-renders, list scrolling)
- Handling offline / flaky network conditions

---

## Stack Choice

**Recommended:** Expo (managed workflow) for most apps.
- Faster setup, OTA updates, built-in APIs (camera, notifications, location)
- Use bare workflow only if you need custom native modules Expo doesn't support

```bash
npx create-expo-app@latest MyApp --template
# Choose: TypeScript + Expo Router (file-based routing, like Next.js)
```

---

## Navigation with Expo Router

Expo Router uses the filesystem as the route definition — same mental model as Next.js App Router.

```
app/
  _layout.tsx         # Root layout (global providers)
  (tabs)/
    _layout.tsx       # Tab bar layout
    index.tsx         # /  (Home tab)
    explore.tsx       # /explore (Explore tab)
  product/
    [id].tsx          # /product/:id (dynamic segment)
  modal.tsx           # Presented as modal
```

```tsx
// app/(tabs)/_layout.tsx — Tab navigator
import { Tabs } from 'expo-router';
import { Home, Compass, User } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#3b82f6' }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size }) => <Compass color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

// Navigation from any component
import { router, Link } from 'expo-router';

// Programmatic navigation
router.push('/product/123');
router.replace('/(tabs)/');  // Replace current screen (no back)
router.back();

// Link component
<Link href="/product/123">View product</Link>

// Dynamic route — app/product/[id].tsx
import { useLocalSearchParams } from 'expo-router';

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useProduct(id);
  // ...
}
```

---

## Platform-Specific Code

```tsx
import { Platform, StyleSheet } from 'react-native';

// Option 1: Platform.select
const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.select({
      ios: 44,      // iOS status bar height
      android: 24,
      default: 0,
    }),
  },
});

// Option 2: Platform.OS check
const shadowStyle = Platform.OS === 'ios'
  ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    }
  : {
      elevation: 4,  // Android equivalent of iOS shadow
    };

// Option 3: Platform-specific files (best for large differences)
// Button.ios.tsx  — iOS version
// Button.android.tsx — Android version
// RN automatically picks the right file based on platform
```

---

## Local Storage

```typescript
// For simple key/value: expo-secure-store (encrypted, for tokens)
import * as SecureStore from 'expo-secure-store';

await SecureStore.setItemAsync('auth_token', token);
const token = await SecureStore.getItemAsync('auth_token');
await SecureStore.deleteItemAsync('auth_token');

// For larger structured data: MMKV (fastest, synchronous)
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();
storage.set('user.id', '123');
storage.set('settings', JSON.stringify({ theme: 'dark' }));
const settings = JSON.parse(storage.getString('settings') ?? '{}');

// For relational data: expo-sqlite
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('app.db');

db.runSync(`
  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    done INTEGER DEFAULT 0
  )
`);

const todos = db.getAllSync<{ id: number; text: string; done: number }>(
  'SELECT * FROM todos WHERE done = 0'
);
```

---

## Push Notifications (Expo)

```typescript
// notifications.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

// Configure foreground behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  // Get Expo push token (for Expo's notification service)
  const token = await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
  });

  // Save token to backend
  await api.post('/users/push-token', { token: token.data });
  return token.data;
}

// Send from backend (using Expo Push API)
async function sendPushNotification(expoPushToken: string, title: string, body: string) {
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: expoPushToken,
      title,
      body,
      data: { screen: 'notifications' },  // Handled in app for deep link
    }),
  });
}
```

---

## Performance: Lists

```tsx
// FlatList: virtual — only renders visible items
import { FlatList, View, Text } from 'react-native';

function ProductList({ products }: { products: Product[] }) {
  const renderItem = useCallback(({ item }: { item: Product }) => (
    <ProductCard product={item} />
  ), []);

  const keyExtractor = useCallback((item: Product) => item.id, []);

  return (
    <FlatList
      data={products}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      // Performance props
      removeClippedSubviews={true}   // Unmount off-screen items
      maxToRenderPerBatch={10}       // Items rendered per batch
      windowSize={10}                // Render window size in viewport units
      initialNumToRender={8}         // Items visible on first paint
      getItemLayout={(data, index) => (
        // If item height is fixed — skips layout measurement (much faster)
        { length: 80, offset: 80 * index, index }
      )}
      // Infinite scroll
      onEndReachedThreshold={0.5}
      onEndReached={fetchNextPage}
      ListFooterComponent={isFetchingNextPage ? <ActivityIndicator /> : null}
    />
  );
}
```

---

## Network Handling

```typescript
// Offline detection
import NetInfo from '@react-native-community/netinfo';

function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected ?? true);
    });
    return unsubscribe;
  }, []);

  return isConnected;
}

// TanStack Query: retry on reconnect
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000),
      // Refetch when app comes back to foreground
      refetchOnWindowFocus: true,
      // Refetch when network reconnects
      refetchOnReconnect: true,
    },
  },
});
```

---

## App Configuration (app.json / app.config.ts)

```typescript
// app.config.ts — dynamic config with env vars
export default {
  expo: {
    name: 'MyApp',
    slug: 'myapp',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    splash: { image: './assets/splash.png', backgroundColor: '#ffffff' },
    ios: {
      bundleIdentifier: 'com.company.myapp',
      supportsTablet: true,
      infoPlist: {
        NSCameraUsageDescription: 'Used for profile photo',
      },
    },
    android: {
      package: 'com.company.myapp',
      permissions: ['CAMERA'],
    },
    extra: {
      apiUrl: process.env.API_URL,
      eas: { projectId: process.env.EAS_PROJECT_ID },
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      ['expo-notifications', { color: '#3b82f6' }],
    ],
  },
};
```

---

## Checklist

- [ ] Expo Router used for file-based navigation
- [ ] Sensitive data (tokens, keys) stored in `expo-secure-store`, not AsyncStorage
- [ ] `FlatList` used for all lists (never `ScrollView` + map for long lists)
- [ ] `keyExtractor` and `renderItem` memoized with `useCallback`
- [ ] `getItemLayout` set for fixed-height list items
- [ ] Platform differences handled with `Platform.select()` or `.ios.tsx`/`.android.tsx`
- [ ] Push notification token saved to backend on permission grant
- [ ] Network connectivity checked before offline-sensitive operations
- [ ] OTA updates configured via EAS Update for post-release patches
- [ ] Deep links configured in `app.config.ts` scheme/intentFilters
