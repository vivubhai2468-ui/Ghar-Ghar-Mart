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
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { Ionicons } from '@expo/vector-icons';

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: 'open' | 'pending' | 'resolved';
  date: string;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

const MOCK_FAQS: FAQ[] = [
  {
    id: '1',
    question: 'How do I place an order?',
    answer: 'Browse products, add items to cart, enter delivery address, choose payment method, and confirm order.',
  },
  {
    id: '2',
    question: 'What is the delivery time?',
    answer: 'Delivery typically takes 30-45 minutes. Delivery time may vary based on location and order volume.',
  },
  {
    id: '3',
    question: 'Can I cancel my order?',
    answer: 'Orders can be canceled before they are processed. Once processing starts, cancellation is not possible.',
  },
  {
    id: '4',
    question: 'What payment methods are accepted?',
    answer: 'We accept online payments (credit/debit card, UPI) and Cash on Delivery.',
  },
  {
    id: '5',
    question: 'How do I use a coupon code?',
    answer: 'Enter the coupon code in the cart before checkout. The discount will be applied automatically.',
  },
];

const MOCK_TICKETS: Ticket[] = [
  {
    id: '1',
    subject: 'Order not received',
    description: 'I did not receive my order #12345',
    status: 'pending',
    date: '2026-07-15',
  },
  {
    id: '2',
    subject: 'Product quality issue',
    description: 'Vegetables were not fresh',
    status: 'resolved',
    date: '2026-07-10',
  },
];

export default function HelpSupportScreen() {
  const [tickets, setTickets] = useState<Ticket[]>(MOCK_TICKETS);
  const [isTicketModalVisible, setIsTicketModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    description: '',
  });

  const router = useRouter();
  const colors = useColors();

  const handleCall = () => {
    Linking.openURL('tel:+919876543210');
  };

  const handleEmail = () => {
    Linking.openURL('mailto:support@gharghartmart.com');
  };

  const handleWhatsApp = () => {
    Linking.openURL('https://wa.me/message/CP543HR63BK4E1');
  };

  const handleRaiseTicket = async () => {
    if (!ticketForm.subject || !ticketForm.description) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      setTimeout(() => {
        const newTicket: Ticket = {
          id: Date.now().toString(),
          subject: ticketForm.subject,
          description: ticketForm.description,
          status: 'open',
          date: new Date().toISOString().split('T')[0],
        };
        setTickets([newTicket, ...tickets]);
        setIsLoading(false);
        setIsTicketModalVisible(false);
        setTicketForm({ subject: '', description: '' });
        Alert.alert('Success', 'Ticket raised successfully. We will get back to you soon.');
      }, 1000);
    } catch (error) {
      setIsLoading(false);
      Alert.alert('Error', 'Failed to raise ticket');
    }
  };

  const renderFAQ = ({ item }: { item: FAQ }) => (
    <TouchableOpacity
      onPress={() =>
        setExpandedFAQ(expandedFAQ === item.id ? null : item.id)
      }
      className="bg-surface rounded-lg mb-3 border p-4"
      style={{ borderColor: colors.border }}
    >
      <View className="flex-row items-center justify-between">
        <Text
          className="font-semibold flex-1"
          style={{ color: colors.foreground }}
        >
          {item.question}
        </Text>
        <Ionicons
          name={
            expandedFAQ === item.id
              ? 'chevron-up'
              : 'chevron-down'
          }
          size={20}
          color={colors.primary}
        />
      </View>
      {expandedFAQ === item.id && (
        <Text
          className="text-muted mt-3 leading-relaxed"
          style={{ color: colors.muted }}
        >
          {item.answer}
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderTicket = ({ item }: { item: Ticket }) => (
    <View
      className="bg-surface rounded-lg mb-3 border p-4"
      style={{ borderColor: colors.border }}
    >
      <View className="flex-row items-start justify-between mb-2">
        <Text
          className="font-bold flex-1"
          style={{ color: colors.foreground }}
        >
          {item.subject}
        </Text>
        <View
          className="rounded-full px-3 py-1"
          style={{
            backgroundColor:
              item.status === 'resolved'
                ? colors.success + '20'
                : item.status === 'pending'
                  ? colors.warning + '20'
                  : colors.primary + '20',
          }}
        >
          <Text
            className="text-xs font-semibold capitalize"
            style={{
              color:
                item.status === 'resolved'
                  ? colors.success
                  : item.status === 'pending'
                    ? colors.warning
                    : colors.primary,
            }}
          >
            {item.status}
          </Text>
        </View>
      </View>
      <Text className="text-muted text-sm mb-2">{item.description}</Text>
      <Text className="text-muted text-xs">{item.date}</Text>
    </View>
  );

  return (
    <ScreenContainer className="bg-background p-0">
      {/* Header */}
      <View className="bg-primary px-4 py-6">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold">Help & Support</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 py-6"
        showsVerticalScrollIndicator={false}
      >
        {/* Contact Options */}
        <Text
          className="text-lg font-bold mb-4"
          style={{ color: colors.foreground }}
        >
          Contact Us
        </Text>

        <View className="flex-row gap-3 mb-6">
          <TouchableOpacity
            onPress={handleCall}
            className="flex-1 bg-primary rounded-lg py-4 items-center"
          >
            <Ionicons name="call" size={24} color="white" />
            <Text className="text-white text-xs font-semibold mt-2">Call</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleEmail}
            className="flex-1 bg-primary rounded-lg py-4 items-center"
          >
            <Ionicons name="mail" size={24} color="white" />
            <Text className="text-white text-xs font-semibold mt-2">Email</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleWhatsApp}
            className="flex-1 bg-primary rounded-lg py-4 items-center"
          >
            <Ionicons name="logo-whatsapp" size={24} color="white" />
            <Text className="text-white text-xs font-semibold mt-2">
              WhatsApp
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 bg-primary rounded-lg py-4 items-center"
          >
            <Ionicons name="chatbubble" size={24} color="white" />
            <Text className="text-white text-xs font-semibold mt-2">Chat</Text>
          </TouchableOpacity>
        </View>

        {/* Raise Ticket */}
        <TouchableOpacity
          onPress={() => setIsTicketModalVisible(true)}
          className="bg-primary rounded-lg py-4 flex-row items-center justify-center gap-2 mb-6"
        >
          <Ionicons name="create" size={20} color="white" />
          <Text className="text-white font-bold">Raise a Ticket</Text>
        </TouchableOpacity>

        {/* My Tickets */}
        <Text
          className="text-lg font-bold mb-4"
          style={{ color: colors.foreground }}
        >
          My Tickets
        </Text>

        {tickets.length === 0 ? (
          <View className="items-center justify-center py-8">
            <Ionicons name="ticket" size={40} color={colors.muted} />
            <Text className="text-muted text-center mt-2">
              No tickets raised yet
            </Text>
          </View>
        ) : (
          <FlatList
            data={tickets}
            renderItem={renderTicket}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            nestedScrollEnabled={true}
          />
        )}

        {/* FAQ */}
        <Text
          className="text-lg font-bold mb-4 mt-6"
          style={{ color: colors.foreground }}
        >
          Frequently Asked Questions
        </Text>

        <FlatList
          data={MOCK_FAQS}
          renderItem={renderFAQ}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          nestedScrollEnabled={true}
        />
      </ScrollView>

      {/* Raise Ticket Modal */}
      <Modal
        visible={isTicketModalVisible}
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
              maxHeight: '80%',
            }}
          >
            <View className="flex-row items-center justify-between mb-6">
              <Text
                className="text-2xl font-bold"
                style={{ color: colors.foreground }}
              >
                Raise a Ticket
              </Text>
              <TouchableOpacity
                onPress={() => setIsTicketModalVisible(false)}
              >
                <Ionicons
                  name="close"
                  size={28}
                  color={colors.foreground}
                />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Subject Field */}
              <View className="mb-4">
                <Text
                  className="font-semibold mb-2"
                  style={{ color: colors.foreground }}
                >
                  Subject *
                </Text>
                <TextInput
                  value={ticketForm.subject}
                  onChangeText={(text) =>
                    setTicketForm({ ...ticketForm, subject: text })
                  }
                  placeholder="Enter subject"
                  placeholderTextColor={colors.muted}
                  className="border rounded-lg p-3"
                  style={{
                    borderColor: colors.border,
                    color: colors.foreground,
                    backgroundColor: colors.surface,
                  }}
                />
              </View>

              {/* Description Field */}
              <View className="mb-6">
                <Text
                  className="font-semibold mb-2"
                  style={{ color: colors.foreground }}
                >
                  Description *
                </Text>
                <TextInput
                  value={ticketForm.description}
                  onChangeText={(text) =>
                    setTicketForm({ ...ticketForm, description: text })
                  }
                  placeholder="Describe your issue"
                  placeholderTextColor={colors.muted}
                  multiline={true}
                  numberOfLines={5}
                  className="border rounded-lg p-3"
                  style={{
                    borderColor: colors.border,
                    color: colors.foreground,
                    backgroundColor: colors.surface,
                    textAlignVertical: 'top',
                  }}
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleRaiseTicket}
                disabled={isLoading}
                className="bg-primary rounded-lg py-4 items-center mb-3"
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-base">
                    Submit Ticket
                  </Text>
                )}
              </TouchableOpacity>

              {/* Cancel Button */}
              <TouchableOpacity
                onPress={() => setIsTicketModalVisible(false)}
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
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
