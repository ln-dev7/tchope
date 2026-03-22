import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useUserRecipes } from '@/hooks/useUserRecipes';
import { useToast } from '@/hooks/useToast';
import type { Region, Difficulty, UserRecipe } from '@/types';

const REGIONS: Region[] = [
  'Littoral', 'Ouest', 'Centre', 'Sud', 'Nord',
  'Est', 'Adamaoua', 'Extrême-Nord', 'Nord-Ouest', 'Sud-Ouest',
];

const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard'];

export default function AddRecipeScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const { addRecipe, updateRecipe, userRecipes } = useUserRecipes();
  const { toast } = useToast();

  const editingRecipe = edit ? userRecipes.find((r) => r.id === edit) : null;
  const isEditing = !!editingRecipe;

  const [name, setName] = useState('');
  const [region, setRegion] = useState<Region>('Centre');
  const [showRegionPicker, setShowRegionPicker] = useState(false);
  const [duration, setDuration] = useState('45');
  const [difficulty, setDifficulty] = useState<Difficulty>('Easy');
  const [ingredients, setIngredients] = useState<{ name: string; quantity: string }[]>([
    { name: '', quantity: '' },
  ]);
  const [steps, setSteps] = useState<string[]>(['']);
  const [imageUri, setImageUri] = useState<string | null>(null);

  useEffect(() => {
    if (editingRecipe) {
      setName(editingRecipe.name);
      setRegion(editingRecipe.region);
      setDuration(String(editingRecipe.duration));
      setDifficulty(editingRecipe.difficulty);
      setIngredients(
        editingRecipe.ingredients.length > 0
          ? editingRecipe.ingredients
          : [{ name: '', quantity: '' }]
      );
      setSteps(
        editingRecipe.steps.length > 0 ? editingRecipe.steps : ['']
      );
      setImageUri(editingRecipe.imageUri ?? null);
    }
  }, [editingRecipe]);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const addIngredientRow = () => {
    setIngredients([...ingredients, { name: '', quantity: '' }]);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length <= 1) return;
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: 'name' | 'quantity', value: string) => {
    const updated = [...ingredients];
    updated[index][field] = value;
    setIngredients(updated);
  };

  const addStepRow = () => {
    setSteps([...steps, '']);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 1) return;
    setSteps(steps.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, value: string) => {
    const updated = [...steps];
    updated[index] = value;
    setSteps(updated);
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('', t('recipeName'));
      return;
    }

    const recipe: UserRecipe = {
      id: isEditing ? editingRecipe!.id : `user-${Date.now()}`,
      name: name.trim(),
      description: '',
      image: null,
      region,
      category: 'Plat',
      duration: parseInt(duration) || 45,
      difficulty,
      spiciness: 'Medium',
      servings: 4,
      rating: 4.5,
      ingredients: ingredients.filter((i) => i.name.trim()),
      steps: steps.filter((s) => s.trim()),
      isUserCreated: true,
      createdAt: isEditing ? editingRecipe!.createdAt : new Date().toISOString(),
      imageUri,
    };

    if (isEditing) {
      updateRecipe(editingRecipe!.id, recipe);
      toast(t('recipeUpdated'), 'done');
    } else {
      addRecipe(recipe);
      toast(t('recipeAdded'), 'done');
    }
    router.back();
  };

  const filledIngredients = ingredients.filter((i) => i.name.trim()).length;

  const inputStyle = {
    backgroundColor: isDark ? colors.card : '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.text,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  } as const;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 24,
          paddingVertical: 16,
          gap: 16,
        }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.accent, letterSpacing: -0.5, flex: 1 }}>
          {isEditing ? t('editRecipe') : t('newRecipe')}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48, gap: 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* Photo Upload */}
        <TouchableOpacity
          onPress={handlePickImage}
          activeOpacity={0.8}
          style={{
            backgroundColor: colors.surface,
            borderRadius: 32,
            borderWidth: 2,
            borderColor: 'rgba(175,173,172,0.3)',
            borderStyle: 'dashed',
            paddingVertical: 32,
            alignItems: 'center',
            gap: 12,
            overflow: 'hidden',
          }}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={{ width: 80, height: 80, borderRadius: 24 }}
            />
          ) : (
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: isDark ? colors.card : '#FFFFFF',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
              }}>
              <Ionicons name="camera-outline" size={28} color={colors.textMuted} />
            </View>
          )}
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, textAlign: 'center' }}>
            {imageUri ? name || t('addPhoto') : t('addPhoto')}
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center' }}>
            {t('photoSubtitle')}
          </Text>
        </TouchableOpacity>

        {/* Name */}
        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary, paddingLeft: 8 }}>
            {t('recipeName')}
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="ex: Ndolé Royal"
            placeholderTextColor={colors.textMuted}
            style={{
              ...inputStyle,
              backgroundColor: colors.inputBg,
              borderRadius: 24,
              paddingVertical: 18,
            }}
          />
        </View>

        {/* Region */}
        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary, paddingLeft: 8 }}>
            {t('region')}
          </Text>
          <TouchableOpacity
            onPress={() => setShowRegionPicker(!showRegionPicker)}
            activeOpacity={0.7}
            style={{
              backgroundColor: colors.inputBg,
              borderRadius: 24,
              paddingHorizontal: 20,
              paddingVertical: 18,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
            <Text style={{ fontSize: 16, color: colors.text }}>{region}</Text>
            <Ionicons
              name={showRegionPicker ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          {showRegionPicker && (
            <View
              style={{
                backgroundColor: isDark ? colors.card : '#FFFFFF',
                borderRadius: 24,
                overflow: 'hidden',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
                elevation: 4,
              }}>
              {REGIONS.map((r, i) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => { setRegion(r); setShowRegionPicker(false); }}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                    backgroundColor: region === r ? (isDark ? colors.surface : colors.surface) : 'transparent',
                    borderBottomWidth: i < REGIONS.length - 1 ? 1 : 0,
                    borderBottomColor: colors.border,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                  <Text style={{ fontSize: 16, color: region === r ? colors.accent : colors.text }}>
                    {r}
                  </Text>
                  {region === r && <Ionicons name="checkmark" size={18} color={colors.accent} />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Duration + Difficulty bento */}
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 28, padding: 20, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="time-outline" size={16} color={colors.accent} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.accent, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                {t('prepTimeLabel')}
              </Text>
            </View>
            <TextInput
              value={duration}
              onChangeText={setDuration}
              keyboardType="numeric"
              placeholder="45"
              placeholderTextColor={colors.textMuted}
              style={{ fontSize: 24, fontWeight: '600', color: colors.text }}
            />
          </View>

          <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 28, padding: 20, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="speedometer-outline" size={14} color={colors.accent} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.accent, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                {t('difficultyLabel')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                const idx = DIFFICULTIES.indexOf(difficulty);
                setDifficulty(DIFFICULTIES[(idx + 1) % DIFFICULTIES.length]);
              }}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>
                {difficulty === 'Easy' ? t('easy') : difficulty === 'Hard' ? t('hard') : t('medium')}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Ingredients */}
        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>
              {t('ingredients')}
            </Text>
            {filledIngredients > 0 && (
              <View style={{ backgroundColor: colors.ingredientBg, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 9999 }}>
                <Text style={{ fontSize: 12, fontWeight: '500', color: colors.chipPeachText }}>
                  {filledIngredients} {t('ingredientsAdded')}
                </Text>
              </View>
            )}
          </View>
          <View style={{ gap: 12 }}>
            {ingredients.map((ing, index) => (
              <View key={index} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <TextInput
                  value={ing.name}
                  onChangeText={(v) => updateIngredient(index, 'name', v)}
                  placeholder={t('ingredientName')}
                  placeholderTextColor={colors.textMuted}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <TextInput
                  value={ing.quantity}
                  onChangeText={(v) => updateIngredient(index, 'quantity', v)}
                  placeholder={t('quantity')}
                  placeholderTextColor={colors.textMuted}
                  style={{ ...inputStyle, width: 90 }}
                />
                <TouchableOpacity
                  onPress={() => removeIngredient(index)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: ing.name.trim() ? 'rgba(231,76,60,0.1)' : colors.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Ionicons
                    name={ing.name.trim() ? 'trash-outline' : 'close-outline'}
                    size={16}
                    color={ing.name.trim() ? '#E74C3C' : colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            ))}
          </View>
          <TouchableOpacity
            onPress={addIngredientRow}
            activeOpacity={0.7}
            style={{
              borderWidth: 2,
              borderColor: 'rgba(175,173,172,0.3)',
              borderStyle: 'dashed',
              borderRadius: 24,
              paddingVertical: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}>
            <Ionicons name="add-circle-outline" size={20} color={colors.textMuted} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textMuted }}>
              {t('addIngredient')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Steps */}
        <View style={{ gap: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>
            {t('steps')}
          </Text>
          <View style={{ gap: 20 }}>
            {steps.map((step, index) => (
              <View key={index} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: step.trim() ? colors.accentLight : (isDark ? '#3A3A3A' : '#E4E2E1'),
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 6,
                  }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '700',
                      color: step.trim() ? '#FFFFFF' : colors.textSecondary,
                    }}>
                    {index + 1}
                  </Text>
                </View>
                <View style={{ flex: 1, position: 'relative' }}>
                  <TextInput
                    value={step}
                    onChangeText={(v) => updateStep(index, v)}
                    placeholder={t('describeStep')}
                    placeholderTextColor={colors.textMuted}
                    multiline
                    style={{
                      ...inputStyle,
                      minHeight: 88,
                      textAlignVertical: 'top',
                      paddingTop: 16,
                    }}
                  />
                  {steps.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removeStep(index)}
                      style={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: 'rgba(231,76,60,0.1)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <Ionicons name="close" size={14} color="#E74C3C" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
          <TouchableOpacity
            onPress={addStepRow}
            activeOpacity={0.7}
            style={{
              borderWidth: 2,
              borderColor: 'rgba(175,173,172,0.3)',
              borderStyle: 'dashed',
              borderRadius: 24,
              paddingVertical: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}>
            <Ionicons name="create-outline" size={20} color={colors.textMuted} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textMuted }}>
              {t('addStep')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={{ gap: 16, paddingTop: 16 }}>
          <TouchableOpacity
            onPress={handleSave}
            activeOpacity={0.85}
            style={{
              height: 64,
              borderRadius: 32,
              backgroundColor: colors.accent,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              shadowColor: colors.accent,
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.2,
              shadowRadius: 15,
              elevation: 6,
            }}>
            <Ionicons name="save-outline" size={18} color="#FFFFFF" />
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#FFFFFF' }}>
              {t('saveRecipe')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={{
              height: 64,
              borderRadius: 32,
              backgroundColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textMuted }}>
              {t('cancel')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
