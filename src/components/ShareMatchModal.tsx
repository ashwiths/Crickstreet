import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Share,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { s, fs, sp, br } from '../theme/responsive';

interface ShareMatchModalProps {
  visible: boolean;
  onClose: () => void;
  matchId: string;
  ownerUid: string;
  myTeamName: string;
  oppTeamName: string;
  format: string;
}

export default function ShareMatchModal({
  visible,
  onClose,
  matchId,
  ownerUid,
  myTeamName,
  oppTeamName,
  format,
}: ShareMatchModalProps) {
  const [accessMode, setAccessMode] = React.useState<'view' | 'edit'>('view');
  const shareUrl = `crickstreet://live-score?matchId=${matchId}&uid=${ownerUid}&mode=${accessMode}`;

  const handleNativeShare = async () => {
    try {
      const modeText = accessMode === 'edit' ? 'Co-Scorer (Edit Access)' : 'Viewer (Only See)';
      const messageText = `Follow the live cricket match score on Crickstreet!\n\n🏏 ${myTeamName} vs ${oppTeamName}\nFormat: ${format}\nAccess: ${modeText}\n\nScan QR code or click the link to join live scorecard:\n${shareUrl}`;
      await Share.share({
        message: messageText,
        title: 'Crickstreet Live Match Scorecard',
      });
    } catch (error) {
      console.error('[ShareMatchModal] Error sharing match:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        {/* Clickable background to close */}
        <TouchableOpacity
          activeOpacity={1}
          style={styles.backdropPressable}
          onPress={onClose}
        />

        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <View style={styles.headerTitleRow}>
              <View style={styles.shareIconWrap}>
                <Feather name="share-2" size={18} color="#2D5016" />
              </View>
              <Text style={styles.cardTitle}>Share Match QR</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.closeBtn}
              onPress={onClose}
            >
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Body Content */}
          <View style={styles.cardBody}>
            <Text style={styles.cardSubtitle}>
              Let another player scan this QR code using their Crickstreet app scanner to track live ball-by-ball score!
            </Text>

            {/* Permission Selector */}
            <View style={styles.selectorContainer}>
              <Text style={styles.selectorTitle}>Access Permission</Text>
              <View style={styles.selectorRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.selectorOption,
                    accessMode === 'view' && styles.selectorOptionActive,
                  ]}
                  onPress={() => setAccessMode('view')}
                >
                  <Feather
                    name="eye"
                    size={14}
                    color={accessMode === 'view' ? '#FFFFFF' : '#4B5563'}
                  />
                  <Text
                    style={[
                      styles.selectorOptionText,
                      accessMode === 'view' && styles.selectorOptionTextActive,
                    ]}
                  >
                    Only See
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.selectorOption,
                    accessMode === 'edit' && styles.selectorOptionActive,
                  ]}
                  onPress={() => setAccessMode('edit')}
                >
                  <Feather
                    name="edit"
                    size={13}
                    color={accessMode === 'edit' ? '#FFFFFF' : '#4B5563'}
                  />
                  <Text
                    style={[
                      styles.selectorOptionText,
                      accessMode === 'edit' && styles.selectorOptionTextActive,
                    ]}
                  >
                    Can Edit
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* QR Code Container */}
            <View style={styles.qrCodeWrapper}>
              <LinearGradient
                colors={['#F5F3E8', '#FFFFFF']}
                style={styles.qrBackground}
              >
                <QRCode
                  value={shareUrl}
                  size={s(160)}
                  color="#0A0D0A"
                  backgroundColor="#FFFFFF"
                />
              </LinearGradient>
              <View style={styles.appBadge}>
                <Text style={styles.appBadgeText}>CRICKSTREET LIVE</Text>
              </View>
            </View>

            {/* Match Information Card */}
            <View style={styles.matchInfoCard}>
              <Text style={styles.matchFormatText}>🏏 {format || 'Overs'}</Text>
              <View style={styles.teamsRow}>
                <Text style={styles.teamNameText} numberOfLines={1}>
                  {myTeamName}
                </Text>
                <Text style={styles.vsText}>VS</Text>
                <Text style={styles.teamNameText} numberOfLines={1}>
                  {oppTeamName}
                </Text>
              </View>
            </View>
          </View>

          {/* Action Footer */}
          <View style={styles.cardFooter}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.shareLinkBtn}
              onPress={handleNativeShare}
            >
              <LinearGradient
                colors={['#59C749', '#46B137']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientBtn}
              >
                <Feather name="share-2" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.shareBtnText}>Share Invite Link</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 13, 10, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: sp.lg,
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: '100%',
    maxWidth: s(320),
    backgroundColor: '#FFFFFF',
    borderRadius: br.xxl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E8E4D4',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sp.lg,
    paddingTop: sp.lg,
    paddingBottom: sp.md,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
  },
  shareIconWrap: {
    width: s(32),
    height: s(32),
    borderRadius: br.md,
    backgroundColor: 'rgba(89, 199, 73, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: fs.lg,
    fontWeight: '800',
    color: '#0A0D0A',
  },
  closeBtn: {
    padding: sp.xs,
  },
  cardBody: {
    alignItems: 'center',
    paddingHorizontal: sp.lg,
  },
  cardSubtitle: {
    fontSize: fs.sm,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: fs.sm * 1.4,
    marginBottom: sp.lg,
  },
  qrCodeWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: sp.lg,
    position: 'relative',
  },
  qrBackground: {
    padding: sp.md2,
    borderRadius: br.xl,
    borderWidth: 1.5,
    borderColor: '#E8E4D4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  appBadge: {
    position: 'absolute',
    bottom: -s(8),
    backgroundColor: '#0A0D0A',
    paddingHorizontal: sp.sm,
    paddingVertical: 3,
    borderRadius: br.sm,
  },
  appBadgeText: {
    fontSize: fs.xxs,
    fontWeight: '800',
    color: '#59C749',
    letterSpacing: 0.8,
  },
  matchInfoCard: {
    width: '100%',
    backgroundColor: '#F5F3E8',
    borderRadius: br.lg,
    padding: sp.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E4D4',
    marginBottom: sp.lg,
  },
  matchFormatText: {
    fontSize: fs.xs,
    fontWeight: '800',
    color: '#B58B00',
    letterSpacing: 0.5,
    marginBottom: sp.xs,
    textTransform: 'uppercase',
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: sp.sm,
  },
  teamNameText: {
    flex: 1,
    fontSize: fs.md,
    fontWeight: '800',
    color: '#2D5016',
    textAlign: 'center',
  },
  vsText: {
    fontSize: fs.xs,
    fontWeight: '800',
    color: '#9CA3AF',
  },
  cardFooter: {
    paddingHorizontal: sp.lg,
    paddingBottom: sp.lg,
  },
  shareLinkBtn: {
    width: '100%',
    borderRadius: br.full,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#59C749',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  gradientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  shareBtnText: {
    fontSize: fs.md,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  selectorContainer: {
    width: '100%',
    marginBottom: sp.md,
  },
  selectorTitle: {
    fontSize: fs.xs,
    fontWeight: '800',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: sp.xs,
    textAlign: 'left',
    width: '100%',
    paddingLeft: sp.xs,
  },
  selectorRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: br.lg,
    padding: 3,
    gap: 4,
  },
  selectorOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sp.xs,
    paddingVertical: sp.sm,
    borderRadius: br.md,
  },
  selectorOptionActive: {
    backgroundColor: '#0A0D0A',
  },
  selectorOptionText: {
    fontSize: fs.xs,
    fontWeight: '700',
    color: '#4B5563',
  },
  selectorOptionTextActive: {
    color: '#59C749',
    fontWeight: '800',
  },
});
