import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Text, View } from "react-native";

/**
 * Placeholder root navigation. Auth-gated navigation and the real Home hub are
 * built in later task groups (user-auth and integration). This foundation ships
 * a single screen that also verifies the NativeWind `className` transform.
 */
export type RootStackParamList = {
  Home: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white gap-2">
      <Text className="text-2xl font-bold text-slate-900">TKD Admin</Text>
      <Text className="text-base text-slate-500">Foundation ready.</Text>
    </View>
  );
}

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: "TKD Admin" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
