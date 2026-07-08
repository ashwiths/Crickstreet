import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  useColorScheme,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { s, fs, sp, br } from '../src/theme/responsive';

interface Section {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  content: string;
  list?: string[];
  extra?: string;
  email?: string;
}

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const systemScheme = useColorScheme();
  const isDark = systemScheme === 'dark';

  const theme = useMemo(() => {
    return {
      bg: isDark ? '#000000' : '#F3F4F1',
      bgMid: isDark ? '#0D131A' : '#FFFFFF',
      cardBg: isDark ? '#0D131A' : '#FFFFFF',
      cardBorder: isDark ? '#1E293B' : '#E8E4D4',
      text: isDark ? '#FFFFFF' : '#1A1A1A',
      textSecondary: isDark ? '#94A3B8' : '#6B7280',
      green: '#59C749',
      greenLight: isDark ? 'rgba(89, 199, 73, 0.15)' : 'rgba(89, 199, 73, 0.1)',
      border: isDark ? '#1E293B' : '#E8E4D4',
      btnBg: isDark ? '#1E293B' : '#F9F8F3',
    };
  }, [isDark]);

  const handleContact = (emailAddress: string) => {
    Linking.openURL(`mailto:${emailAddress}`);
  };

  const sections: Section[] = [
    {
      icon: 'database',
      title: 'Information We Collect',
      content: 'We may collect:',
      list: [
        'Name',
        'Email address',
        'Google account information',
        'Profile picture',
        'Team information',
        'Match statistics',
        'Device information',
        'App usage analytics',
      ],
    },
    {
      icon: 'cpu',
      title: 'How We Use Your Information',
      content: 'We use your information to:',
      list: [
        'Create your account',
        'Authenticate users',
        'Save match history',
        'Display player profiles',
        'Improve app performance',
        'Provide customer support',
      ],
    },
    {
      icon: 'lock',
      title: 'Google Sign-In',
      content: 'When you sign in with Google, we only access the information you authorize. Typically this includes:',
      list: [
        'Name',
        'Email',
        'Profile picture',
      ],
      extra: 'We never access your password.',
    },
    {
      icon: 'hard-drive',
      title: 'Data Storage',
      content: 'Your data is securely stored using Firebase services.',
      extra: 'We implement reasonable security measures to protect your information.',
    },
    {
      icon: 'share-2',
      title: 'Data Sharing',
      content: 'We do not sell your personal information.',
      extra: 'We may share data only:',
      list: [
        'When required by law',
        'To protect user safety',
        'To provide essential services',
      ],
    },
    {
      icon: 'bar-chart-2',
      title: 'Analytics',
      content: 'Anonymous usage information may be collected to improve Crickstreet.',
      extra: 'No sensitive personal information is sold to advertisers.',
    },
    {
      icon: 'key',
      title: 'Your Rights',
      content: 'You may:',
      list: [
        'Update your profile',
        'Request deletion of your account',
        'Contact us regarding your data',
      ],
    },
    {
      icon: 'smile',
      title: "Children's Privacy",
      content: 'Crickstreet is not intended for children under 13 years of age.',
    },
    {
      icon: 'refresh-cw',
      title: 'Policy Updates',
      content: 'This Privacy Policy may be updated periodically.',
      extra: 'Changes become effective immediately after publication.',
    },
    {
      icon: 'mail',
      title: 'Contact',
      content: 'For privacy questions:',
      email: 'support@crickstreet.app',
    },
  ];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.bgMid} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.bgMid, borderBottomColor: theme.cardBorder }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.backButton, { backgroundColor: theme.btnBg, borderColor: theme.cardBorder }]}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Privacy Policy</Text>
        <View style={{ width: s(40) }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Document Intro Hero Card */}
        <View style={[styles.heroCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
          <View style={[styles.heroIconContainer, { backgroundColor: theme.greenLight }]}>
            <Feather name="lock" size={32} color={theme.green} />
          </View>
          <Text style={[styles.heroTitle, { color: theme.text }]}>Crickstreet Privacy Policy</Text>
          <Text style={[styles.heroSubtitle, { color: theme.textSecondary }]}>Last Updated: July 2026</Text>
          <Text style={[styles.heroDesc, { color: theme.textSecondary }]}>
            Your privacy is important to us. This Privacy Policy explains how Crickstreet collects, uses, and protects your information.
          </Text>
        </View>

        {/* Section Cards */}
        <View style={styles.sectionsList}>
          {sections.map((section, index) => (
            <View key={index} style={[styles.sectionCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.sectionIconContainer, { backgroundColor: theme.greenLight }]}>
                  <Feather name={section.icon} size={18} color={theme.green} />
                </View>
                <Text style={[styles.cardTitle, { color: theme.text }]}>{section.title}</Text>
              </View>

              <View style={styles.cardBody}>
                <Text style={[styles.cardText, { color: theme.textSecondary }]}>{section.content}</Text>

                {section.list && (
                  <View style={styles.bulletList}>
                    {section.list.map((item, idx) => (
                      <View key={idx} style={styles.bulletItem}>
                        <View style={[styles.bulletDot, { backgroundColor: theme.green }]} />
                        <Text style={[styles.bulletText, { color: theme.textSecondary }]}>{item}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {section.extra && (
                  <Text style={[styles.cardTextExtra, { color: theme.textSecondary }]}>{section.extra}</Text>
                )}

                {section.email && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[styles.contactButton, { backgroundColor: theme.green }]}
                    onPress={() => handleContact(section.email!)}
                  >
                    <Feather name="mail" size={16} color="#FFFFFF" style={{ marginRight: sp.sm }} />
                    <Text style={styles.contactButtonText}>{section.email}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    height: s(56),
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sp.md,
    borderBottomWidth: 1,
  },
  backButton: {
    width: s(40),
    height: s(40),
    borderRadius: s(20),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: fs.lg,
    fontWeight: '800',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: sp.lg,
    gap: sp.lg,
    paddingBottom: sp.xxl * 2,
  },
  heroCard: {
    padding: sp.lg,
    borderRadius: br.xl,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: 'rgba(0,0,0,0.02)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  heroIconContainer: {
    width: s(64),
    height: s(64),
    borderRadius: s(32),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: sp.md,
  },
  heroTitle: {
    fontSize: fs.xl,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: sp.xs,
  },
  heroSubtitle: {
    fontSize: fs.sm,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: sp.md,
  },
  heroDesc: {
    fontSize: fs.sm,
    lineHeight: fs.sm * 1.5,
    textAlign: 'center',
  },
  sectionsList: {
    gap: sp.md,
  },
  sectionCard: {
    padding: sp.md2,
    borderRadius: br.lg,
    borderWidth: 1,
    shadowColor: 'rgba(0,0,0,0.01)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
    marginBottom: sp.sm,
  },
  sectionIconContainer: {
    width: s(32),
    height: s(32),
    borderRadius: s(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: fs.md2,
    fontWeight: '700',
  },
  cardBody: {
    paddingLeft: s(40),
  },
  cardText: {
    fontSize: fs.sm,
    lineHeight: fs.sm * 1.5,
  },
  cardTextExtra: {
    fontSize: fs.sm,
    lineHeight: fs.sm * 1.5,
    marginTop: sp.sm,
  },
  bulletList: {
    marginTop: sp.sm,
    gap: sp.xs,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
  },
  bulletDot: {
    width: s(6),
    height: s(6),
    borderRadius: s(3),
  },
  bulletText: {
    fontSize: fs.sm,
    flex: 1,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: sp.sm2,
    paddingHorizontal: sp.md,
    borderRadius: br.full,
    marginTop: sp.md,
    alignSelf: 'flex-start',
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontSize: fs.sm,
    fontWeight: '600',
  },
});
