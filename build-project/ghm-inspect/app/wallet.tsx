import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { Ionicons } from '@expo/vector-icons';

interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
}

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: '1',
    type: 'credit',
    amount: 50,
    description: 'Cashback on order #12345',
    date: '2026-07-15',
    status: 'completed',
  },
  {
    id: '2',
    type: 'debit',
    amount: 250,
    description: 'Payment for order #12340',
    date: '2026-07-14',
    status: 'completed',
  },
  {
    id: '3',
    type: 'credit',
    amount: 100,
    description: 'Referral bonus',
    date: '2026-07-10',
    status: 'completed',
  },
  {
    id: '4',
    type: 'debit',
    amount: 500,
    description: 'Wallet recharge',
    date: '2026-07-08',
    status: 'completed',
  },
];

export default function WalletScreen() {
  const [walletBalance, setWalletBalance] = useState(2450);
  const [cashback, setCashback] = useState(150);
  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);
  const [isRechargeModalVisible, setIsRechargeModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'recharge' | 'cashback'>('all');

  const router = useRouter();
  const colors = useColors();

  const handleAddMoney = async () => {
    if (!rechargeAmount || isNaN(Number(rechargeAmount))) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    try {
      setTimeout(() => {
        const amount = Number(rechargeAmount);
        setWalletBalance(walletBalance + amount);
        const newTransaction: Transaction = {
          id: Date.now().toString(),
          type: 'credit',
          amount: amount,
          description: 'Wallet recharge',
          date: new Date().toISOString().split('T')[0],
          status: 'completed',
        };
        setTransactions([newTransaction, ...transactions]);
        setIsLoading(false);
        setIsRechargeModalVisible(false);
        setRechargeAmount('');
        Alert.alert('Success', `₹${amount} added to wallet successfully`);
      }, 1500);
    } catch (error) {
      setIsLoading(false);
      Alert.alert('Error', 'Failed to add money to wallet');
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'recharge') return t.description.includes('recharge');
    if (activeTab === 'cashback') return t.description.includes('Cashback') || t.description.includes('Referral');
    return true;
  });

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View
      className="flex-row items-center justify-between p-4 mb-2 rounded-lg border"
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
      }}
    >
      <View className="flex-row items-center gap-3 flex-1">
        <View
          className="w-12 h-12 rounded-full items-center justify-center"
          style={{
            backgroundColor:
              item.type === 'credit'
                ? colors.success + '20'
                : colors.error + '20',
          }}
        >
          <Ionicons
            name={item.type === 'credit' ? 'arrow-down' : 'arrow-up'}
            size={20}
            color={item.type === 'credit' ? colors.success : colors.error}
          />
        </View>
        <View className="flex-1">
          <Text
            className="font-semibold"
            style={{ color: colors.foreground }}
          >
            {item.description}
          </Text>
          <Text className="text-muted text-xs mt-1">{item.date}</Text>
        </View>
      </View>
      <Text
        className="font-bold text-base"
        style={{
          color: item.type === 'credit' ? colors.success : colors.foreground,
        }}
      >
        {item.type === 'credit' ? '+' : '-'}₹{item.amount}
      </Text>
    </View>
  );

  return (
    <ScreenContainer className="bg-background p-0">
      {/* Header */}
      <View className="bg-primary px-4 py-6">
        <View className="flex-row items-center gap-3 mb-6">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold">My Wallet</Text>
        </View>

        {/* Wallet Card */}
        <View
          className="rounded-2xl p-6 border-2"
          style={{
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderColor: 'rgba(255,255,255,0.3)',
          }}
        >
          <Text className="text-white/80 text-sm mb-2">Wallet Balance</Text>
          <Text className="text-white text-4xl font-bold mb-6">₹{walletBalance}</Text>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="text-white/80 text-xs mb-1">Cashback</Text>
              <Text className="text-white text-xl font-bold">₹{cashback}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-white/80 text-xs mb-1">Refunds</Text>
              <Text className="text-white text-xl font-bold">₹0</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 py-6" showsVerticalScrollIndicator={false}>
        {/* Add Money Button */}
        <TouchableOpacity
          onPress={() => setIsRechargeModalVisible(true)}
          className="bg-primary rounded-lg py-4 flex-row items-center justify-center gap-2 mb-6"
        >
          <Ionicons name="add-circle" size={24} color="white" />
          <Text className="text-white font-bold text-base">Add Money</Text>
        </TouchableOpacity>

        {/* Tabs */}
        <View className="flex-row gap-2 mb-6">
          {['all', 'recharge', 'cashback'].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab as any)}
              className={`flex-1 py-3 rounded-lg border ${
                activeTab === tab ? 'bg-primary border-primary' : ''
              }`}
              style={{
                borderColor: activeTab === tab ? colors.primary : colors.border,
                backgroundColor:
                  activeTab === tab ? colors.primary : colors.surface,
              }}
            >
              <Text
                className="text-center font-semibold capitalize"
                style={{
                  color:
                    activeTab === tab ? 'white' : colors.foreground,
                }}
              >
                {tab === 'all' ? 'All' : tab === 'recharge' ? 'Recharge' : 'Cashback'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Transactions */}
        <Text
          className="text-lg font-bold mb-4"
          style={{ color: colors.foreground }}
        >
          Transaction History
        </Text>

        {filteredTransactions.length === 0 ? (
          <View className="items-center justify-center py-12">
            <Ionicons name="wallet" size={48} color={colors.muted} />
            <Text className="text-muted text-center mt-4">
              No transactions yet
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredTransactions}
            renderItem={renderTransaction}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        )}
      </ScrollView>

      {/* Add Money Modal */}
      <Modal
        visible={isRechargeModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View
          className="flex-1 bg-black/50 items-end"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <View
            className="w-full bg-background rounded-t-3xl p-6"
            style={{
              backgroundColor: colors.background,
              maxHeight: '60%',
            }}
          >
            <View className="flex-row items-center justify-between mb-6">
              <Text
                className="text-2xl font-bold"
                style={{ color: colors.foreground }}
              >
                Add Money
              </Text>
              <TouchableOpacity
                onPress={() => setIsRechargeModalVisible(false)}
              >
                <Ionicons
                  name="close"
                  size={28}
                  color={colors.foreground}
                />
              </TouchableOpacity>
            </View>

            <Text
              className="font-semibold mb-3"
              style={{ color: colors.foreground }}
            >
              Enter Amount
            </Text>
            <TextInput
              value={rechargeAmount}
              onChangeText={setRechargeAmount}
              placeholder="Enter amount in ₹"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              className="border rounded-lg p-4 mb-6 text-lg"
              style={{
                borderColor: colors.border,
                color: colors.foreground,
                backgroundColor: colors.surface,
              }}
            />

            {/* Quick Amount Buttons */}
            <Text
              className="font-semibold mb-3"
              style={{ color: colors.foreground }}
            >
              Quick Amount
            </Text>
            <View className="flex-row gap-2 mb-6 flex-wrap">
              {[100, 250, 500, 1000].map((amount) => (
                <TouchableOpacity
                  key={amount}
                  onPress={() => setRechargeAmount(amount.toString())}
                  className="flex-1 min-w-[45%] border rounded-lg py-3 items-center"
                  style={{ borderColor: colors.primary }}
                >
                  <Text
                    className="font-semibold"
                    style={{ color: colors.primary }}
                  >
                    ₹{amount}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Add Button */}
            <TouchableOpacity
              onPress={handleAddMoney}
              disabled={isLoading}
              className="bg-primary rounded-lg py-4 items-center mb-3"
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-base">
                  Add Money
                </Text>
              )}
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              onPress={() => setIsRechargeModalVisible(false)}
              className="border-2 rounded-lg py-4 items-center"
              style={{ borderColor: colors.primary }}
            >
              <Text
                className="font-bold text-base"
                style={{ color: colors.primary }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
