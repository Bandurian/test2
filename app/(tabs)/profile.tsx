import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

interface Profile {
  first_name: string;
  last_name: string;
  email: string;
  diet_type: string;
  calorie_goal: number;
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile>({
    first_name: '',
    last_name: '',
    email: '',
    diet_type: 'omnivore',
    calorie_goal: 2000,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/(auth)');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileData) {
        setProfile({
          first_name: profileData.first_name || '',
          last_name: profileData.last_name || '',
          email: user.email || '',
          diet_type: profileData.diet_type || 'omnivore',
          calorie_goal: profileData.calorie_goal || 2000,
        });
      } else {
        setProfile((prev) => ({ ...prev, email: user.email || '' }));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from('profiles').upsert({
        id: user?.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        diet_type: profile.diet_type,
        calorie_goal: profile.calorie_goal,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/(auth)');
    } catch (error) {
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Informations personnelles</Text>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.secondary }]}>Prénom</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
            value={profile.first_name}
            onChangeText={(text) => setProfile({ ...profile, first_name: text })}
            placeholder="Entrez votre prénom"
            placeholderTextColor={colors.icon}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.secondary }]}>Nom</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
            value={profile.last_name}
            onChangeText={(text) => setProfile({ ...profile, last_name: text })}
            placeholder="Entrez votre nom"
            placeholderTextColor={colors.icon}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.secondary }]}>E-mail</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.secondary, borderColor: colors.border }]}
            value={profile.email}
            editable={false}
          />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Préférences</Text>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.secondary }]}>Type de régime</Text>
          <View style={styles.dietOptions}>
            {[
              { value: 'omnivore', label: 'Omnivore' },
              { value: 'vegetarian', label: 'Végétarien' },
              { value: 'vegan', label: 'Végétalien' },
              { value: 'keto', label: 'Céto' },
            ].map((diet) => (
              <TouchableOpacity
                key={diet.value}
                style={[
                  styles.dietOption,
                  { borderColor: colors.border },
                  profile.diet_type === diet.value && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => setProfile({ ...profile, diet_type: diet.value })}
              >
                <Text
                  style={[
                    styles.dietOptionText,
                    { color: colors.text },
                    profile.diet_type === diet.value && { color: '#fff' },
                  ]}
                >
                  {diet.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.secondary }]}>Objectif calorique quotidien</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
            value={profile.calorie_goal.toString()}
            onChangeText={(text) => setProfile({ ...profile, calorie_goal: parseInt(text) || 0 })}
            keyboardType="numeric"
            placeholder="Entrez votre objectif"
            placeholderTextColor={colors.icon}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
          onPress={handleSaveProfile}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Enregistrer les modifications</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.signOutButton, { borderColor: colors.error }]} onPress={handleSignOut}>
          <Text style={[styles.signOutButtonText, { color: colors.error }]}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  dietOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dietOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  dietOptionText: {
    fontSize: 14,
  },
  saveButton: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButton: {
    height: 50,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  signOutButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
