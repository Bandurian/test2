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
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

interface ShoppingItem {
  id: string;
  product_name: string;
  quantity: number;
  unit: string;
  is_purchased: boolean;
}

export default function ShoppingScreen() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('pcs');
  const supabase = createClient();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    loadShoppingList();
  }, []);

  const loadShoppingList = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const listId = await getOrCreateShoppingList(user?.id);

      const { data: shoppingItems } = await supabase
        .from('shopping_list_items')
        .select('*')
        .eq('shopping_list_id', listId)
        .order('created_at', { ascending: false });

      setItems(shoppingItems || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to load shopping list');
    } finally {
      setLoading(false);
    }
  };

  const getOrCreateShoppingList = async (userId: string | undefined) => {
    if (!userId) return null;

    const { data: existingList } = await supabase
      .from('shopping_lists')
      .select('id')
      .eq('user_id', userId)
      .is('meal_plan_id', null)
      .maybeSingle();

    if (existingList) {
      return existingList.id;
    }

    const { data: newList } = await supabase
      .from('shopping_lists')
      .insert({
        user_id: userId,
        name: 'My Shopping List',
      })
      .select('id')
      .single();

    return newList?.id;
  };

  const handleAddItem = async () => {
    if (!newItemName) {
      Alert.alert('Error', 'Please enter item name');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const listId = await getOrCreateShoppingList(user?.id);

      const { error } = await supabase.from('shopping_list_items').insert({
        shopping_list_id: listId,
        product_name: newItemName,
        quantity: parseFloat(newItemQuantity) || 1,
        unit: newItemUnit,
        is_purchased: false,
      });

      if (error) throw error;

      setNewItemName('');
      setNewItemQuantity('');
      setNewItemUnit('pcs');
      loadShoppingList();
    } catch (error) {
      Alert.alert('Error', 'Failed to add item');
    }
  };

  const handleToggleItem = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('shopping_list_items')
        .update({ is_purchased: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, is_purchased: !currentStatus } : item))
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update item');
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const { error } = await supabase.from('shopping_list_items').delete().eq('id', id);

      if (error) throw error;

      loadShoppingList();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete item');
    }
  };

  const pendingItems = items.filter((item) => !item.is_purchased);
  const purchasedItems = items.filter((item) => item.is_purchased);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.addSection}>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border, flex: 2 }]}
          placeholder="Item name"
          placeholderTextColor={colors.icon}
          value={newItemName}
          onChangeText={setNewItemName}
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border, flex: 1 }]}
          placeholder="Qty"
          placeholderTextColor={colors.icon}
          value={newItemQuantity}
          onChangeText={setNewItemQuantity}
          keyboardType="numeric"
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border, flex: 1 }]}
          placeholder="Unit"
          placeholderTextColor={colors.icon}
          value={newItemUnit}
          onChangeText={setNewItemUnit}
        />
        <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={handleAddItem}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {pendingItems.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>To Buy</Text>
            {pendingItems.map((item) => (
              <View key={item.id} style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.checkbox, { borderColor: colors.border }]}
                  onPress={() => handleToggleItem(item.id, item.is_purchased)}
                >
                  {item.is_purchased && <View style={[styles.checkboxChecked, { backgroundColor: colors.primary }]} />}
                </TouchableOpacity>
                <View style={styles.itemContent}>
                  <Text style={[styles.itemName, { color: colors.text }]}>{item.product_name}</Text>
                  <Text style={[styles.itemQuantity, { color: colors.secondary }]}>
                    {item.quantity} {item.unit}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleDeleteItem(item.id)}>
                  <Text style={[styles.deleteButton, { color: colors.error }]}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {purchasedItems.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Purchased</Text>
            {purchasedItems.map((item) => (
              <View key={item.id} style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.checkbox, { borderColor: colors.border }]}
                  onPress={() => handleToggleItem(item.id, item.is_purchased)}
                >
                  <View style={[styles.checkboxChecked, { backgroundColor: colors.primary }]} />
                </TouchableOpacity>
                <View style={styles.itemContent}>
                  <Text style={[styles.itemName, styles.itemPurchased, { color: colors.secondary }]}>
                    {item.product_name}
                  </Text>
                  <Text style={[styles.itemQuantity, { color: colors.secondary }]}>
                    {item.quantity} {item.unit}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleDeleteItem(item.id)}>
                  <Text style={[styles.deleteButton, { color: colors.error }]}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {items.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.secondary }]}>No items in your shopping list</Text>
          </View>
        )}
      </ScrollView>
    </View>
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
  addSection: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    marginBottom: 2,
  },
  itemPurchased: {
    textDecorationLine: 'line-through',
  },
  itemQuantity: {
    fontSize: 14,
  },
  deleteButton: {
    fontSize: 20,
    padding: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
