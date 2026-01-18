'use client'
import { Geist_400Regular, Geist_500Medium, Geist_700Bold, useFonts } from '@expo-google-fonts/geist'
import { GeistMono_400Regular } from '@expo-google-fonts/geist-mono'
import { Slot } from 'expo-router'
import './globals.css'

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Geist: Geist_400Regular,
    'Geist-Medium': Geist_500Medium,
    'Geist-Bold': Geist_700Bold,
    GeistMono: GeistMono_400Regular,
    // добавьте все нужные стили из пакета
  })

  if (!fontsLoaded) return null

  return <Slot />
}
