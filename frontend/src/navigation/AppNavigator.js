// ================================================
// NEXO - Navegación principal de la app
// Archivo: frontend/src/navigation/AppNavigator.js
// ================================================

import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import useStore from '../store/useStore';

// Pantallas de autenticación
import LoginScreen    from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

// Pantallas principales
import HomeScreen     from '../screens/HomeScreen';
import EntornoScreen  from '../screens/EntornoScreen';
import MatchesScreen  from '../screens/MatchesScreen';
import ChatScreen     from '../screens/ChatScreen';
import ProfileScreen  from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';

// ── Mejoras v2.0 ─────────────────────────────────────────────────
import ActiveNowScreen     from '../screens/ActiveNowScreen';
import VerificationScreen  from '../screens/VerificationScreen';
import EventsScreen        from '../screens/EventsScreen';
// ── v3: correcciones + funciones nuevas ──────────────────────────
import VideoCallScreen     from '../screens/VideoCallScreen';
import GamificationScreen  from '../screens/GamificationScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ============================================
// TABS PRINCIPALES (menú inferior)
// ============================================
function MainTabs() {
  const { mensajesNoLeidos } = useStore();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(15,15,26,0.97)',
          borderTopColor: 'rgba(255,255,255,0.08)',
          borderTopWidth: 0.5,
          paddingTop: 8,
          paddingBottom: 8,
          height: 65,
        },
        tabBarActiveTintColor: '#FF6B9D',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
        tabBarLabelStyle: { fontSize: 10, marginTop: 2 },
        tabBarIcon: ({ focused, color, size }) => {
          const iconos = {
            Explorar:  focused ? 'search' : 'search-outline',
            Entorno:   focused ? 'globe' : 'globe-outline',
            Mensajes:  focused ? 'chatbubbles' : 'chatbubbles-outline',
            Matches:   focused ? 'heart' : 'heart-outline',
            MiPerfil:  focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={iconos[route.name]} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Explorar"  component={HomeScreen} />
      <Tab.Screen name="Entorno"   component={EntornoScreen} />
      <Tab.Screen name="Mensajes"  component={MatchesScreen}
        options={{ tabBarBadge: mensajesNoLeidos > 0 ? mensajesNoLeidos : undefined }}
      />
      <Tab.Screen name="Matches"   component={MatchesScreen} />
      <Tab.Screen name="MiPerfil"  component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ============================================
// NAVEGACIÓN PRINCIPAL
// ============================================
export default function AppNavigator() {
  const { isAuthenticated, isLoading, inicializar } = useStore();

  useEffect(() => { inicializar(); }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0f0f1a', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#C44DFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          // FLUJO DE AUTENTICACIÓN
          <>
            <Stack.Screen name="Login"    component={LoginScreen} />
            <Stack.Screen name="Registro" component={RegisterScreen} />
          </>
        ) : (
          // FLUJO PRINCIPAL
          <>
            <Stack.Screen name="Main"          component={MainTabs} />
            <Stack.Screen name="Chat"          component={ChatScreen} />
            <Stack.Screen name="VerPerfil"     component={ProfileScreen} />
            <Stack.Screen name="Configuracion" component={SettingsScreen} />
            {/* v2.0 */}
            <Stack.Screen name="ActivosAhora"  component={ActiveNowScreen} />
            <Stack.Screen name="Verificacion"  component={VerificationScreen} />
            <Stack.Screen name="Eventos"       component={EventsScreen} />
            {/* v3 */}
            <Stack.Screen name="Videollamada"  component={VideoCallScreen}
              options={{ presentation: "fullScreenModal", headerShown: false }} />
            <Stack.Screen name="Logros"        component={GamificationScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
