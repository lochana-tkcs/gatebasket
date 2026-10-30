import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Field, Gradient, Txt } from '@/components/ui';
import { errorMessage, supabase } from '@/lib/supabase';
import { Brand, Colors, Spacing } from '@/lib/theme';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fullPhone = `+91${phone.replace(/\D/g, '')}`;

  async function sendCode() {
    if (phone.replace(/\D/g, '').length !== 10) {
      Alert.alert('Enter your 10-digit mobile number');
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
    setBusy(false);
    if (error) Alert.alert('Could not send code', errorMessage(error));
    else setSentTo(fullPhone);
  }

  async function verify() {
    if (!sentTo) return;
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ phone: sentTo, token: code.trim(), type: 'sms' });
    setBusy(false);
    // On success the auth listener updates the session and the router moves on.
    if (error) Alert.alert('Wrong code', errorMessage(error));
  }

  return (
    <Gradient style={{ flex: 1 }}>
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.logo}>
            <Ionicons name="basket" size={44} color={Colors.primary} />
          </View>
          <Txt variant="title" color="#fff" style={{ fontSize: 30 }}>
            {Brand.name}
          </Txt>
          <Txt color={Colors.headerTextDim}>{Brand.tagline}</Txt>
        </View>

        {sentTo ? (
          <Card style={styles.form}>
            <Txt color={Colors.textSecondary}>Enter the 6-digit code sent to {sentTo}</Txt>
            <Field
              label="Verification code"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              placeholder="••••••"
            />
            <Button title="Verify & continue" onPress={verify} loading={busy} disabled={code.trim().length < 6} />
            <Button title="Change number" variant="ghost" onPress={() => setSentTo(null)} />
          </Card>
        ) : (
          <Card style={styles.form}>
            <Field
              label="Mobile number (+91)"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={10}
              placeholder="98765 43210"
            />
            <Button title="Get OTP" onPress={sendCode} loading={busy} />
          </Card>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
    </Gradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: Spacing.xl, justifyContent: 'center', gap: Spacing.xxl },
  hero: { alignItems: 'center', gap: Spacing.sm },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  form: { gap: Spacing.lg, padding: Spacing.xl },
});
