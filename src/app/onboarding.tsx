import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Chip, Field, Txt } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { errorMessage, supabase } from '@/lib/supabase';
import { Colors, Spacing } from '@/lib/theme';
import type { Flat } from '@/lib/types';

type Society = { id: string; name: string; address: string | null; flats: Flat[] };

export default function OnboardingScreen() {
  const { refreshProfile, signOut } = useAuth();
  const [code, setCode] = useState('');
  const [society, setSociety] = useState<Society | null>(null);
  const [block, setBlock] = useState<string | null>(null);
  const [flatId, setFlatId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const blocks = useMemo(() => [...new Set(society?.flats.map((f) => f.block))], [society]);
  const flatsInBlock = society?.flats.filter((f) => f.block === block) ?? [];

  async function findSociety() {
    setBusy(true);
    const { data, error } = await supabase.rpc('society_by_code', { p_code: code });
    setBusy(false);
    if (error) Alert.alert('Error', errorMessage(error));
    else if (!data) Alert.alert('Society not found', 'Check the code with your society office.');
    else setSociety(data as Society);
  }

  async function join() {
    if (!flatId) return;
    setBusy(true);
    const { error } = await supabase.rpc('join_society', { p_code: code, p_flat_id: flatId, p_name: name });
    if (error) {
      setBusy(false);
      Alert.alert('Could not join', errorMessage(error));
      return;
    }
    await refreshProfile();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Txt variant="title">Join your community</Txt>

        {!society ? (
          <>
            <Txt color={Colors.textSecondary}>Enter the society code shared by your society office or store.</Txt>
            <Field
              label="Society code"
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
              placeholder="e.g. GREEN1"
            />
            <Button title="Continue" onPress={findSociety} loading={busy} disabled={!code.trim()} />
          </>
        ) : (
          <>
            <Card style={{ gap: 2 }}>
              <Txt variant="heading">{society.name}</Txt>
              {society.address && <Txt color={Colors.textSecondary}>{society.address}</Txt>}
            </Card>

            <Txt variant="label">Block / Tower</Txt>
            <View style={styles.chips}>
              {blocks.map((b) => (
                <Chip
                  key={b}
                  label={`Block ${b}`}
                  selected={block === b}
                  onPress={() => {
                    setBlock(b);
                    setFlatId(null);
                  }}
                />
              ))}
            </View>

            {block && (
              <>
                <Txt variant="label">Flat</Txt>
                <View style={styles.chips}>
                  {flatsInBlock.map((f) => (
                    <Chip key={f.id} label={f.number} selected={flatId === f.id} onPress={() => setFlatId(f.id)} />
                  ))}
                </View>
              </>
            )}

            <Field label="Your name" value={name} onChangeText={setName} placeholder="Full name" />
            <Button title="Join community" onPress={join} loading={busy} disabled={!flatId || !name.trim()} />
            <Button title="Use a different code" variant="ghost" onPress={() => setSociety(null)} />
          </>
        )}

        <Button title="Sign out" variant="ghost" onPress={signOut} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.xl, gap: Spacing.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
});
