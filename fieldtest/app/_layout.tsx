import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../constants/colors';

/**
 * Root layout — wraps the entire application.
 * Sets up the navigation stack and global status bar.
 */
export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: Colors.surface,
          },
          headerTintColor: Colors.primary,
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 17,
          },
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: Colors.background,
          },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="test/capture"
          options={{
            title: 'New Field Test',
            presentation: 'fullScreenModal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="test/review"
          options={{
            title: 'Review Capture',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="test/result"
          options={{
            title: 'Classification',
            headerBackVisible: false,
          }}
        />
        <Stack.Screen
          name="test/sealed"
          options={{
            title: 'Record Sealed',
            headerBackVisible: false,
          }}
        />
        <Stack.Screen
          name="verify/[id]"
          options={{
            title: 'Verify Record',
          }}
        />
      </Stack>
    </>
  );
}
