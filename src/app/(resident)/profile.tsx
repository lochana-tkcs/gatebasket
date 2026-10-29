import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, Card, Row, Txt, type IconName } from '@/components/ui';
import { useAuth, useProfile } from '@/lib/auth';
import { flatLabel } from '@/lib/format';
import { Brand, Colors, Spacing } from '@/lib/theme';

function InfoRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <Row style={{ gap: Spacing.md }}>
      <Ionicons name={icon} size={20} color={Colors.primary} />
      <View>
        <Txt variant="caption">{label}</Txt>
        <Txt>{value}</Txt>
      </View>
    </Row>
  );
}

export default function ProfileScreen() {
  const profile = useProfile();
  const { signOut } = useAuth();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.avatar}>
        <Txt variant="title" color="#fff">
          {(profile.name ?? '?').charAt(0).toUpperCase()}
        </Txt>
      </View>
      <Txt variant="title" style={{ textAlign: 'center' }}>
        {profile.name}
      </Txt>

      <Card style={{ gap: Spacing.lg }}>
        <InfoRow icon="call" label="Phone" value={profile.phone ? `+${profile.phone}` : '—'} />
        <InfoRow icon="business" label="Society" value={profile.society?.name ?? '—'} />
        <InfoRow icon="home" label="Flat" value={flatLabel(profile.flat) || '—'} />
      </Card>

      <Button title="Sign out" variant="danger" icon="log-out-outline" onPress={signOut} />
      <Txt variant="caption" style={{ textAlign: 'center' }}>
        {Brand.name} v1.0
      </Txt>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.xl, gap: Spacing.lg },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
