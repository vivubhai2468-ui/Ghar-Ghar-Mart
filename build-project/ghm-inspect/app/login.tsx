import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useAuth, type UserRole } from '@/lib/auth-context';
import { shouldRequestForegroundLocationAfterLogin } from '@/lib/delivery-location-permission';
import { useColors } from '@/hooks/use-colors';
import { ScreenContainer } from '@/components/screen-container';
import { trpc } from '@/lib/trpc';
import { getSignedInEntryRoute } from '@/lib/entry-routing';
import { getUserFacingError } from '@/lib/user-facing-error';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('customer');
  const [showOTP, setShowOTP] = useState(false);
  const [passwordResetRequested, setPasswordResetRequested] = useState(false);
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { completeVerifiedPhoneAuth, loginAsGuest } = useAuth();
  const colors = useColors();
  const requestOtp = trpc.auth.phoneOtp.request.useMutation();
  const directCustomerSignIn = trpc.auth.directCustomer.signIn.useMutation();
  const requestCustomerPasswordReset = trpc.auth.directCustomer.requestPasswordReset.useMutation();
  const requestPartnerPasswordReset = trpc.auth.partnerPassword.requestPasswordReset.useMutation();
  const partnerPasswordSignIn = trpc.auth.partnerPassword.signIn.useMutation();
  const setPartnerPassword = trpc.auth.partnerPassword.setWithOtp.useMutation();

  const requestDeliveryPartnerLocationPermission = async () => {
    if (Platform.OS === 'web') return;
    try {
      if (!await Location.hasServicesEnabledAsync()) {
        Alert.alert('Turn on location services', 'Enable device location so delivery progress can be shared once you start a route.');
        return;
      }
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Location access needed', 'Enable location access in device settings to share live delivery progress after a route starts.');
      }
    } catch {
      Alert.alert('Location setup unavailable', 'You can enable location access later in device settings before starting a delivery route.');
    }
  };

  const handleDirectCustomerSignIn = async () => {
    if (phone.replace(/\D/g, '').length !== 10) {
      Alert.alert('Check your mobile number', 'Enter a valid 10-digit mobile number.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Check your password', 'Your password must contain at least 8 characters.');
      return;
    }
    try {
      const result = await directCustomerSignIn.mutateAsync({ phone, password });
      await completeVerifiedPhoneAuth(result);
      router.replace(getSignedInEntryRoute('customer'));
    } catch (error) {
      Alert.alert('Could not sign in', getUserFacingError(error, 'Please check your mobile number and password.'));
    }
  };

  const handleSendOTP = async () => {
    if (phone.replace(/\D/g, '').length !== 10) {
      Alert.alert('Check your mobile number', 'Enter a valid 10-digit mobile number.');
      return;
    }
    setIsLoading(true);
    try {
      const result = await requestOtp.mutateAsync({ phone, purpose: 'login' });
      setOtp('');
      setPassword('');
      setShowOTP(true);
      if (result.previewCode) {
        Alert.alert('Preview OTP', `Use ${result.previewCode} while SMS delivery is not configured.`);
      }
    } catch (error) {
      Alert.alert('Unable to send code', getUserFacingError(error, 'Please try again in a moment.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordResetStart = async () => {
    if (phone.replace(/\D/g, '').length !== 10) {
      const accountType = selectedRole === 'delivery_partner' ? 'delivery-partner' : selectedRole;
      Alert.alert('Check your mobile number', `Enter the 10-digit mobile number linked to your ${accountType} account.`);
      return;
    }
    setIsLoading(true);
    try {
      if (selectedRole === 'customer') {
        await requestCustomerPasswordReset.mutateAsync({ phone });
      } else {
        await requestPartnerPasswordReset.mutateAsync({
          phone,
          role: selectedRole === 'seller' ? 'seller' : 'delivery_partner',
        });
      }
      setPasswordResetRequested(true);
    } catch (error) {
      Alert.alert('Unable to send reset link', getUserFacingError(error, 'Please try again in a moment.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePartnerSignIn = async () => {
    if (phone.replace(/\D/g, '').length !== 10) {
      Alert.alert('Check your mobile number', 'Enter a valid 10-digit mobile number.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Check your password', 'Your password must contain at least 8 characters.');
      return;
    }
    setIsLoading(true);
    try {
      const role = selectedRole === 'seller' ? 'seller' : 'delivery_partner';
      const result = await partnerPasswordSignIn.mutateAsync({ phone, password, role });
      await completeVerifiedPhoneAuth(result);
      if (shouldRequestForegroundLocationAfterLogin(role, result.user.deliveryPartnerStatus)) {
        await requestDeliveryPartnerLocationPermission();
      }
      router.replace(getSignedInEntryRoute(role));
    } catch (error) {
      Alert.alert('Could not sign in', getUserFacingError(error, 'Please check your mobile number and password.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!/^\d{6}$/.test(otp)) {
      Alert.alert('Enter OTP', 'Please enter the 6-digit code sent to your mobile number.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Check your password', 'Your password must contain at least 8 characters.');
      return;
    }
    setIsLoading(true);
    try {
      const role = selectedRole === 'seller' ? 'seller' : 'delivery_partner';
      const result = await setPartnerPassword.mutateAsync({ phone, code: otp, password, role });
      const signedInRole = role;
      await completeVerifiedPhoneAuth(result);
      if (shouldRequestForegroundLocationAfterLogin(signedInRole, result.user.deliveryPartnerStatus)) {
        await requestDeliveryPartnerLocationPermission();
      }
      router.replace(getSignedInEntryRoute(signedInRole));
    } catch (error) {
      Alert.alert('Password setup failed', getUserFacingError(error, 'The code could not be verified. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestMode = async () => {
    await loginAsGuest();
    router.replace('/(tabs)');
  };

  const roles: Array<{ label: string; value: UserRole }> = [
    { label: 'Customer', value: 'customer' },
    { label: 'Seller', value: 'seller' },
    { label: 'Delivery Partner', value: 'delivery_partner' },
  ];

  return (
    <ScreenContainer className="bg-background" containerClassName="bg-background">
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Welcome to Ghar Ghar Mart
          </Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Sign in to your account
          </Text>
        </View>

        {/* Role Selection */}
        <View style={styles.roleContainer}>
          <Text style={[styles.label, { color: colors.foreground }]}>
            Login as:
          </Text>
          <View style={styles.roleButtons}>
            {roles.map((role) => (
              <TouchableOpacity
                key={role.value}
                onPress={() => { setSelectedRole(role.value); setShowOTP(false); setPasswordResetRequested(false); setOtp(''); setPassword(''); }}
                style={[
                  styles.roleButton,
                  {
                    backgroundColor:
                      selectedRole === role.value
                        ? colors.primary
                        : colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.roleButtonText,
                    {
                      color:
                        selectedRole === role.value
                          ? colors.background
                          : colors.foreground,
                    },
                  ]}
                >
                  {role.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {passwordResetRequested ? (
          <>
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.foreground }]}>Check your email</Text>
              <Text style={{ color: colors.muted, lineHeight: 21 }}>If a {selectedRole === 'customer' ? 'customer' : selectedRole === 'seller' ? 'seller' : 'delivery partner'} account is registered with this mobile number and has an email address on file, a secure password reset link has been sent. The link expires in 30 minutes. If you have no email on file, contact support to update your account.</Text>
            </View>
            <TouchableOpacity onPress={() => setPasswordResetRequested(false)} disabled={isLoading} style={{ alignItems: 'center', marginTop: 16 }}>
              <Text style={[styles.changePhoneText, { color: colors.primary }]}>Back to sign in</Text>
            </TouchableOpacity>
          </>
        ) : selectedRole === 'customer' ? (
          <>
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.foreground }]}> 
                Phone Number
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                ]}
              >
                <Text style={[styles.countryCode, { color: colors.muted }]}>
                  +91
                </Text>
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Enter your phone number"
                  placeholderTextColor={colors.muted}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  editable={!isLoading}
                />
              </View>
            </View>
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.foreground }]}>Password</Text>
              <TextInput
                style={[styles.passwordInput, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.foreground }]}
                placeholder="Enter your password"
                placeholderTextColor={colors.muted}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                editable={!directCustomerSignIn.isPending}
                autoComplete="password"
              />
            </View>

            <TouchableOpacity
              onPress={handleDirectCustomerSignIn}
              disabled={directCustomerSignIn.isPending}
              style={[
                styles.primaryButton,
                { backgroundColor: colors.primary, opacity: directCustomerSignIn.isPending ? 0.6 : 1 },
              ]}
            >
              {directCustomerSignIn.isPending ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={[styles.primaryButtonText, { color: colors.background }]}> 
                  Sign in
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={handlePasswordResetStart} disabled={isLoading || directCustomerSignIn.isPending} style={{ alignItems: 'center', marginTop: 16 }}>
              <Text style={{ color: colors.primary, fontWeight: '600' }}>Forgot password?</Text>
            </TouchableOpacity>
          </>
        ) : !showOTP ? (
          <>
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.foreground }]}>Phone Number</Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={[styles.countryCode, { color: colors.muted }]}>+91</Text>
                <TextInput style={[styles.input, { color: colors.foreground }]} placeholder="Enter your phone number" placeholderTextColor={colors.muted} keyboardType="phone-pad" value={phone} onChangeText={setPhone} editable={!isLoading} />
              </View>
            </View>
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.foreground }]}>Password</Text>
              <TextInput
                style={[styles.passwordInput, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.foreground }]}
                placeholder="Enter your password"
                placeholderTextColor={colors.muted}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                editable={!isLoading}
                autoComplete="password"
              />
            </View>
            <TouchableOpacity onPress={handlePartnerSignIn} disabled={isLoading} style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: isLoading ? 0.6 : 1 }]}>
              {isLoading ? <ActivityIndicator color={colors.background} /> : <Text style={[styles.primaryButtonText, { color: colors.background }]}>Sign in</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={handlePasswordResetStart} disabled={isLoading} style={{ alignItems: 'center', marginTop: 16 }}>
              <Text style={{ color: colors.primary, fontWeight: '600' }}>Forgot password? Email me a reset link</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSendOTP} disabled={isLoading} style={{ alignItems: 'center', marginTop: 16 }}>
              <Text style={{ color: colors.primary, fontWeight: '600' }}>Set password with OTP</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                Verification code
              </Text>
              <Text style={[styles.otpInfo, { color: colors.muted }]}> 
                We&apos;ve sent a 6-digit code to {phone}
              </Text>
              <TextInput
                style={[
                  styles.otpInput,
                  { borderColor: colors.primary, color: colors.foreground },
                ]}
                placeholder="000000"
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={setOtp}
                editable={!isLoading}
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.foreground }]}>New password</Text>
              <TextInput
                style={[styles.passwordInput, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.foreground }]}
                placeholder="At least 8 characters"
                placeholderTextColor={colors.muted}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                editable={!isLoading}
                autoComplete="new-password"
              />
            </View>
            <TouchableOpacity onPress={handleVerifyOTP} disabled={isLoading} style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: isLoading ? 0.6 : 1 }]}>
              {isLoading ? <ActivityIndicator color={colors.background} /> : <Text style={[styles.primaryButtonText, { color: colors.background }]}>Verify and set password</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSendOTP} disabled={isLoading} style={{ alignItems: 'center', marginTop: 16 }}>
              <Text style={{ color: colors.primary, fontWeight: '600' }}>Resend verification code</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setShowOTP(false); setOtp(''); setPassword(''); }} disabled={isLoading} style={{ alignItems: 'center', marginTop: 16 }}>
              <Text style={[styles.changePhoneText, { color: colors.primary }]}>Back to sign in</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Guest Mode */}
        <TouchableOpacity
          onPress={handleGuestMode}
          style={[styles.secondaryButton, { borderColor: colors.primary }]}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
            Continue as Guest
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/register')} style={{ alignSelf: 'center', marginTop: 18 }}>
          <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 14 }}>New customer? Create your account</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/register')} style={{ alignSelf: 'center', marginTop: 14 }}>
          <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 14 }}>Want to sell with us? Create a verified seller account</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/delivery-register')} style={{ alignSelf: 'center', marginTop: 14, marginBottom: 8 }}>
          <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 14 }}>Want to deliver with us? Create a delivery partner account</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
  },
  roleContainer: {
    marginBottom: 30,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  passwordInput: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  otpInfo: {
    fontSize: 12,
    marginBottom: 12,
  },
  otpInput: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 12,
    letterSpacing: 10,
  },
  primaryButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  changePhoneText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
  },
});
