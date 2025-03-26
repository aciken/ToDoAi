import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { GlobalProvider } from './context/GlobalProvider';

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <GlobalProvider>
                <Stack>
                    <Stack.Screen
                        name="index"
                    options={{
                        headerShown: false,
                    }}
                />
                <Stack.Screen
                    name="modal"
                    options={{
                        headerShown: false,
                        presentation: 'modal',
                        animation: 'slide_from_bottom',
                        animationDuration: 800,
                    }}
                />
                <Stack.Screen
                    name="main"
                    options={{
                        headerShown: false,
                        gestureEnabled: false,
                    }}
                />
                          <Stack.Screen
                    name="main/TimelineView"
                    options={{
                        headerShown: false,
                        gestureEnabled: true,
                        gestureDirection: 'horizontal',
                        animation: 'slide_from_right',
                        animationEnabled: true,
                        navigationBarHidden: true,
                        gestureResponseDistance: 50,
                        headerBackVisible: false,
                        headerLeft: () => null,
                        customAnimationOnWeb: true,
                        animationDuration: 300,
                    }}
                />
            </Stack>

            </GlobalProvider>
        </GestureHandlerRootView>
    )
}
