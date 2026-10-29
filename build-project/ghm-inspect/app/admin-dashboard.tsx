import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Linking,
  Image,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { getUserFacingError } from "@/lib/user-facing-error";
import { useAdminAuth } from "@/lib/admin-auth-context";
import { PRODUCTS as BUILT_IN_PRODUCTS } from "@/lib/products-data";
import { trpc } from "@/lib/trpc";

type TabId = "overview" | "orders" | "catalogue" | "people" | "sellers";
type OrderStatus = "pending" | "confirmed" | "packed" | "shipped" | "delivered" | "cancelled";

type AdminOrder = {
  id: number;
  orderNumber: string;
  customer: string;
  amount: number;
  shippingCost: number;
  deliveryDistanceKm: number | null;
  paymentStatus: "pending" | "completed" | "failed";
  paymentProofUrl?: string | null;
  status: OrderStatus;
  date: string;
  items: number;
};

type Seller = {
  id: number;
  name: string;
  owner: string;
  products: number;
  rating: number;
  status: "approved" | "pending" | "rejected";
};

type AdminProduct = { id: number; name: string; category: string; price: number; stock: number; status: string; builtIn?: boolean };
type AdminPerson = { id: number; name: string; email: string; orders: number; tag: string };
type LiveOrder = { id: number; orderNumber: string; userId: number; total: string | number; shippingCost?: string | number | null; deliveryDistanceKm?: string | number | null; paymentStatus: "pending" | "completed" | "failed"; paymentProofUrl?: string | null; status: OrderStatus; createdAt: Date | string };
type LiveProduct = { id: number; name: string; categoryId: number; price: string | number; stock: number; isActive: boolean; approvalStatus?: "pending" | "approved" | "rejected"; builtIn?: boolean };
type LiveSeller = {
  id: number;
  name: string | null;
  shopName: string | null;
  shopLogo?: string | null;
  shopDescription?: string | null;
  address?: string | null;
  shopHours?: { openingTime?: string; closingTime?: string; openDays?: string[] } | null;
  shopRating: string | number | null;
  shopStatus: Seller["status"] | null;
  isActive?: boolean | null;
};
type LiveCustomer = { id: number; name: string | null; email: string | null; phone: string | null; isActive: boolean };
type LiveCategory = { id: number; name: string; isActive: boolean };
type ProductDraft = { sellerId: string; categoryId: string; name: string; description: string; price: string; originalPrice: string; discount: string; stock: string; publishImmediately: boolean };

const TAB_ITEMS: Array<{ id: TabId; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: "overview", label: "Overview", icon: "grid-outline" },
  { id: "orders", label: "Orders", icon: "receipt-outline" },
  { id: "catalogue", label: "Catalogue", icon: "cube-outline" },
  { id: "people", label: "People", icon: "people-outline" },
  { id: "sellers", label: "Sellers", icon: "storefront-outline" },
];

const STATUS_COLORS: Record<string, { background: string; text: string; dot: string }> = {
  pending: { background: "#FFF4C6", text: "#9A6700", dot: "#F59E0B" },
  confirmed: { background: "#E0F2FE", text: "#0369A1", dot: "#0EA5E9" },
  shipped: { background: "#F0E8FF", text: "#6D28D9", dot: "#8B5CF6" },
  delivered: { background: "#DDF6E8", text: "#167044", dot: "#22C55E" },
  cancelled: { background: "#FDE7E7", text: "#B42318", dot: "#EF4444" },
  approved: { background: "#DDF6E8", text: "#167044", dot: "#22C55E" },
  rejected: { background: "#FDE7E7", text: "#B42318", dot: "#EF4444" },
  active: { background: "#DDF6E8", text: "#167044", dot: "#22C55E" },
  "out of stock": { background: "#FDE7E7", text: "#B42318", dot: "#EF4444" },
  "low stock": { background: "#FFF4C6", text: "#9A6700", dot: "#F59E0B" },
};

function StatusChip({ label }: { label: string }) {
  const colors = STATUS_COLORS[label] ?? STATUS_COLORS.pending;
  return (
    <View style={[styles.statusChip, { backgroundColor: colors.background }]}>
      <View style={[styles.statusDot, { backgroundColor: colors.dot }]} />
      <Text style={[styles.statusText, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

function SectionHeading({ title, detail, action, onAction }: { title: string; detail?: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionHeadingCopy}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {detail ? <Text style={styles.sectionDetail}>{detail}</Text> : null}
      </View>
      {action && onAction ? (
        <Pressable onPress={onAction} style={({ pressed }) => [styles.textAction, pressed && styles.pressed]}>
          <Text style={styles.textActionLabel}>{action}</Text>
          <Ionicons name="arrow-forward" size={16} color="#28723B" />
        </Pressable>
      ) : null}
    </View>
  );
}

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { adminUser, adminLogout } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const utils = trpc.useUtils();
  const liveQueryOptions = { enabled: Boolean(adminUser), refetchInterval: 15000, refetchOnWindowFocus: true };
  const ordersQuery = trpc.admin.orders.list.useQuery({ limit: 100 }, { ...liveQueryOptions, refetchInterval: 2000, staleTime: 0 });
  const productsQuery = trpc.admin.products.list.useQuery({ limit: 1000 }, { ...liveQueryOptions, enabled: Boolean(adminUser) && (activeTab === "overview" || activeTab === "catalogue") });
  const shopperProductsQuery = trpc.products.list.useQuery({ limit: 1000, offset: 0 }, { ...liveQueryOptions, enabled: Boolean(adminUser) && activeTab === "catalogue" });
  const customersQuery = trpc.admin.users.list.useQuery({ search: "", limit: 100 }, { ...liveQueryOptions, enabled: Boolean(adminUser) && activeTab === "people" });
  const sellersQuery = trpc.admin.sellers.list.useQuery({ search: "", limit: 100 }, { ...liveQueryOptions, enabled: Boolean(adminUser) && (activeTab === "sellers" || activeTab === "catalogue") });
  const categoriesQuery = trpc.categories.list.useQuery(undefined, { enabled: Boolean(adminUser), refetchOnWindowFocus: true });
  const dashboardQuery = trpc.admin.dashboard.useQuery(undefined, { ...liveQueryOptions, enabled: Boolean(adminUser) && activeTab === "overview" });
  const updateOrderStatus = trpc.admin.orders.updateStatus.useMutation({ onSuccess: () => void Promise.all([utils.admin.orders.list.invalidate(), utils.admin.dashboard.invalidate()]) });
  const updatePaymentStatus = trpc.admin.orders.updatePaymentStatus.useMutation({ onSuccess: () => { void utils.admin.orders.list.invalidate(); Alert.alert("Payment updated", "The payment review status has been saved."); } });
  const approveSeller = trpc.admin.sellers.approve.useMutation({ onSuccess: () => void Promise.all([utils.admin.sellers.list.invalidate(), utils.admin.dashboard.invalidate()]) });
  const rejectSeller = trpc.admin.sellers.reject.useMutation({ onSuccess: () => void Promise.all([utils.admin.sellers.list.invalidate(), utils.admin.dashboard.invalidate()]) });
  const updateProductStatus = trpc.admin.products.updateStatus.useMutation({ onSuccess: () => void Promise.all([utils.admin.products.list.invalidate(), utils.admin.dashboard.invalidate()]) });
  const createProduct = trpc.admin.products.create.useMutation({
    onSuccess: async (product) => {
      await Promise.all([
        utils.admin.products.list.invalidate(),
        utils.admin.dashboard.invalidate(),
        utils.products.list.invalidate(),
        utils.categories.list.invalidate(),
        utils.categories.listWithCounts.invalidate(),
      ]);
      setProductModal(false);
      setProductDraft((current) => ({ ...current, name: "", description: "", price: "", originalPrice: "", discount: "", stock: "" }));
      if (product?.approvalStatus === "approved" && product.isActive) {
        Alert.alert("Product published", "The product is now available through the live consumer catalogue.");
      } else {
        Alert.alert("Product submitted", "The product is saved and will appear in the consumer catalogue after it is approved.");
      }
    },
    onError: (error) => Alert.alert("Product was not saved", getUserFacingError(error, "Please check the product details and try again.")),
  });
  const orders = useMemo<AdminOrder[]>(() => (ordersQuery.data as LiveOrder[] | undefined ?? []).map((order: LiveOrder) => ({ id: order.id, orderNumber: order.orderNumber, customer: `Customer #${order.userId}`, amount: Number(order.total), shippingCost: Number(order.shippingCost ?? 0), deliveryDistanceKm: order.deliveryDistanceKm == null ? null : Number(order.deliveryDistanceKm), paymentStatus: order.paymentStatus, paymentProofUrl: order.paymentProofUrl, status: order.status, date: new Date(order.createdAt).toLocaleString(), items: 0 })), [ordersQuery.data]);
  const catalogueRecords = useMemo(() => {
    const records = new Map<number, LiveProduct>();
    for (const product of (productsQuery.data as LiveProduct[] | undefined ?? [])) records.set(product.id, product);
    for (const product of (shopperProductsQuery.data as LiveProduct[] | undefined ?? [])) {
      if (!records.has(product.id)) records.set(product.id, product);
    }
    for (const product of BUILT_IN_PRODUCTS) {
      const id = Number(product.id);
      if (!records.has(id)) {
        records.set(id, {
          id,
          name: product.name,
          categoryId: 0,
          price: product.price,
          stock: product.stock,
          isActive: true,
          approvalStatus: "approved",
          builtIn: true,
        });
      }
    }
    return Array.from(records.values());
  }, [productsQuery.data, shopperProductsQuery.data]);
  const products = useMemo<AdminProduct[]>(() => catalogueRecords.map((product: LiveProduct) => ({
    id: product.id,
    name: product.name,
    category: (categoriesQuery.data as LiveCategory[] | undefined)?.find((category) => category.id === product.categoryId)?.name ?? (product.categoryId === 0 ? "Built-in catalogue" : `Category #${product.categoryId}`),
    price: Number(product.price),
    stock: product.stock,
    builtIn: product.builtIn,
    status: product.approvalStatus && product.approvalStatus !== "approved"
      ? product.approvalStatus
      : product.isActive
        ? (product.stock === 0 ? "out of stock" : product.stock < 20 ? "low stock" : "active")
        : "inactive",
  })), [catalogueRecords, categoriesQuery.data]);
  const sellers = useMemo(() => (sellersQuery.data as LiveSeller[] | undefined ?? []).map((seller) => ({
    ...seller,
    id: seller.id,
    name: seller.shopName || seller.name || `Seller #${seller.id}`,
    owner: seller.name || "Unknown owner",
    products: 0,
    rating: Number(seller.shopRating || 0),
    status: seller.shopStatus || "pending",
  })), [sellersQuery.data]);
  const people = useMemo<AdminPerson[]>(() => (customersQuery.data as LiveCustomer[] | undefined ?? []).map((customer: LiveCustomer) => ({ id: customer.id, name: customer.name || `Customer #${customer.id}`, email: customer.email || customer.phone || "No contact", orders: 0, tag: customer.isActive ? "Active account" : "Inactive account" })), [customersQuery.data]);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [newStatus, setNewStatus] = useState<OrderStatus>("pending");
  const [orderStatusModal, setOrderStatusModal] = useState(false);
  const [productModal, setProductModal] = useState(false);
  const [productDraft, setProductDraft] = useState<ProductDraft>({ sellerId: "", categoryId: "", name: "", description: "", price: "", originalPrice: "", discount: "", stock: "", publishImmediately: true });

  const handleLogout = () => {
    Alert.alert("Sign out", "Sign out of the administrator control center?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => {
          void adminLogout();
          router.replace("/admin-login");
        },
      },
    ]);
  };

  const pendingSellerCount = useMemo(() => sellers.filter((seller) => seller.status === "pending").length, [sellers]);
  const lowStockCount = useMemo(() => products.filter((product) => product.stock < 20).length, [products]);
  const pendingOrderCount = useMemo(() => orders.filter((order) => order.status === "pending").length, [orders]);
  const canManageProducts = productsQuery.isSuccess;

  if (!adminUser) {
    return (
      <ScreenContainer className="items-center justify-center bg-[#F4F8F0] px-6" containerClassName="bg-[#F4F8F0]">
        <View style={styles.accessGate}>
          <View style={styles.accessGateIcon}><Ionicons name="lock-closed" size={25} color="#14532D" /></View>
          <Text style={styles.accessGateTitle}>Administrator sign-in required</Text>
          <Text style={styles.accessGateText}>Sign in to open the Ghar Ghar Mart control center and manage orders, sellers, and delivery operations.</Text>
          <Pressable onPress={() => router.replace("/admin-login")} style={({ pressed }) => [styles.accessGateButton, pressed && styles.pressed]}>
            <Text style={styles.accessGateButtonText}>Go to admin login</Text>
            <Ionicons name="arrow-forward" size={18} color="#14532D" />
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const openOrderStatus = (order: AdminOrder) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setOrderStatusModal(true);
  };

  const confirmStatusUpdate = () => {
    if (!selectedOrder) return;
    updateOrderStatus.mutate({ id: selectedOrder.id, status: newStatus }, { onSuccess: () => { setOrderStatusModal(false); Alert.alert("Order updated", `${selectedOrder.orderNumber} is now marked ${newStatus}.`); } });
  };

  const reviewPayment = (paymentStatus: "completed" | "failed") => {
    if (!selectedOrder) return;
    updatePaymentStatus.mutate({ id: selectedOrder.id, paymentStatus });
  };

  const updateSellerStatus = (seller: Seller, status: Seller["status"]) => {
    const mutation = status === "approved" ? approveSeller : rejectSeller;
    mutation.mutate(seller.id, { onSuccess: () => Alert.alert(status === "approved" ? "Seller approved" : "Seller rejected", `${seller.name} has been ${status}.`) });
  };

  const removeProduct = (productId: number, productName: string) => {
    Alert.alert("Remove product", `Remove ${productName} from the current catalogue?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => updateProductStatus.mutate({ id: productId, isActive: false }) },
    ]);
  };

  const openProductCreator = () => {
    const approvedSeller = (sellersQuery.data as LiveSeller[] | undefined ?? []).find((seller) => seller.shopStatus === "approved");
    const firstCategory = (categoriesQuery.data as LiveCategory[] | undefined ?? []).find((category) => category.isActive);
    setProductDraft((current) => ({ ...current, sellerId: current.sellerId || String(approvedSeller?.id ?? ""), categoryId: current.categoryId || String(firstCategory?.id ?? "") }));
    setProductModal(true);
  };

  const submitProduct = () => {
    const sellerId = Number(productDraft.sellerId);
    const categoryId = Number(productDraft.categoryId);
    const price = Number(productDraft.price);
    const stock = Number(productDraft.stock);
    if (!sellerId || !categoryId || productDraft.name.trim().length < 2 || !Number.isFinite(price) || price <= 0 || !Number.isInteger(stock) || stock < 0) {
      Alert.alert("Complete product details", "Choose an approved seller and category, then enter a valid name, price, and whole-number stock quantity.");
      return;
    }
    createProduct.mutate({ sellerId, categoryId, name: productDraft.name.trim(), description: productDraft.description.trim() || undefined, price, originalPrice: productDraft.originalPrice.trim() ? Number(productDraft.originalPrice) : undefined, discount: productDraft.discount.trim() ? Number(productDraft.discount) : undefined, stock, publishImmediately: productDraft.publishImmediately });
  };

  const stats = [
    { label: "Revenue all time", value: `₹${Number(dashboardQuery.data?.totalRevenue ?? 0).toLocaleString()}`, trend: "Live orders total", icon: "trending-up" as const, accent: "#2E7D32", tint: "#E7F5E8" },
    { label: "Orders in database", value: String(dashboardQuery.data?.totalOrders ?? orders.length), trend: `${pendingOrderCount} need review`, icon: "receipt" as const, accent: "#1D78C8", tint: "#E6F3FF" },
    { label: "Seller approvals", value: String(pendingSellerCount), trend: `${sellers.length} seller records`, icon: "shield-checkmark" as const, accent: "#C88700", tint: "#FFF4CC" },
    { label: "Active customers", value: String(dashboardQuery.data?.activeUsers ?? people.length), trend: `${dashboardQuery.data?.totalUsers ?? people.length} customer records`, icon: "people" as const, accent: "#9B5B00", tint: "#FFF0DB" },
  ];

  const renderOverview = () => (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.heroCard}>
        <View style={styles.heroOrbOne} />
        <View style={styles.heroOrbTwo} />
        <View style={styles.heroTopRow}>
          <View style={styles.eyebrowRow}>
            <View style={styles.liveDot} />
            <Text style={styles.eyebrowText}>LIVE OPERATIONS</Text>
          </View>
          <Pressable onPress={() => router.push("/admin-delivery")} style={({ pressed }) => [styles.heroIconButton, pressed && styles.pressed]}>
            <Ionicons name="bicycle" size={20} color="#14532D" />
          </Pressable>
        </View>
        <Text style={styles.heroTitle}>Good morning, {adminUser.name.split(" ")[0]}.</Text>
        <Text style={styles.heroSubtext}>Your store is moving smoothly. Keep an eye on the three tasks waiting for a decision.</Text>
        <View style={styles.heroCtaRow}>
          <Pressable onPress={() => setActiveTab("orders")} style={({ pressed }) => [styles.primaryHeroButton, pressed && styles.pressed]}>
            <Text style={styles.primaryHeroButtonText}>Review orders</Text>
            <Ionicons name="arrow-forward" size={17} color="#14532D" />
          </Pressable>
          <View style={styles.heroMetric}>
            <Text style={styles.heroMetricNumber}>{pendingOrderCount}</Text>
            <Text style={styles.heroMetricLabel}>awaiting</Text>
          </View>
        </View>
      </View>

      <View style={styles.statGrid}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: stat.tint }]}>
              <Ionicons name={stat.icon} size={20} color={stat.accent} />
            </View>
            <Text style={styles.statLabel}>{stat.label}</Text>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={[styles.statTrend, { color: stat.accent }]}>{stat.trend}</Text>
          </View>
        ))}
      </View>

      <View style={styles.pricingCard}>
        <View style={styles.pricingHeader}><View><Text style={styles.pricingTitle}>Delivery pricing</Text><Text style={styles.pricingDetail}>Fixed rate · actual road distance · excess kilometres rounded up</Text></View><Ionicons name="navigate-outline" size={22} color="#28723B" /></View>
        <Text style={styles.pricingFormula}>₹10 for the first 2 km · ₹5 per started kilometre after that · ₹2 donation per order</Text>
      </View>

      <SectionHeading title="Priority inbox" detail="Respond to the work that can affect fulfilment." />
      <View style={styles.inboxCard}>
        <Pressable onPress={() => setActiveTab("orders")} style={({ pressed }) => [styles.inboxRow, pressed && styles.pressed]}>
          <View style={[styles.inboxIcon, { backgroundColor: "#FFF4CC" }]}><Ionicons name="receipt-outline" size={20} color="#A76F00" /></View>
          <View style={styles.inboxCopy}><Text style={styles.inboxTitle}>{pendingOrderCount} new orders need confirmation</Text><Text style={styles.inboxMeta}>Open orders · fulfilment queue</Text></View>
          <Ionicons name="chevron-forward" size={20} color="#9AA99C" />
        </Pressable>
        <View style={styles.rowDivider} />
        <Pressable onPress={() => router.push("/admin-verification")} style={({ pressed }) => [styles.inboxRow, pressed && styles.pressed]}>
          <View style={[styles.inboxIcon, { backgroundColor: "#E7F5E8" }]}><Ionicons name="shield-checkmark-outline" size={20} color="#28723B" /></View>
          <View style={styles.inboxCopy}><Text style={styles.inboxTitle}>{pendingSellerCount} seller file awaiting review</Text><Text style={styles.inboxMeta}>Identity & payout checklist</Text></View>
          <Ionicons name="chevron-forward" size={20} color="#9AA99C" />
        </Pressable>
        <View style={styles.rowDivider} />
        <Pressable onPress={() => setActiveTab("catalogue")} style={({ pressed }) => [styles.inboxRow, pressed && styles.pressed]}>
          <View style={[styles.inboxIcon, { backgroundColor: "#FFF0DB" }]}><Ionicons name="cube-outline" size={20} color="#A45A00" /></View>
          <View style={styles.inboxCopy}><Text style={styles.inboxTitle}>{lowStockCount} catalogue items need stock attention</Text><Text style={styles.inboxMeta}>Protect availability before the next rush</Text></View>
          <Ionicons name="chevron-forward" size={20} color="#9AA99C" />
        </Pressable>
      </View>

      <SectionHeading title="Latest orders" detail="A quick snapshot from the fulfilment queue." action="View all" onAction={() => setActiveTab("orders")} />
      <View style={styles.listCard}>
        {orders.slice(0, 3).map((order, index) => (
          <View key={order.id}>
            <Pressable onPress={() => openOrderStatus(order)} style={({ pressed }) => [styles.orderRow, pressed && styles.pressed]}>
              <View style={styles.orderAvatar}><Text style={styles.orderAvatarText}>{order.customer.charAt(0)}</Text></View>
              <View style={styles.orderCopy}><Text style={styles.orderId}>{order.orderNumber}</Text><Text style={styles.orderCustomer}>{order.customer} · {order.items} items</Text></View>
              <View style={styles.orderValue}><Text style={styles.orderAmount}>₹{order.amount}</Text><StatusChip label={order.status} /></View>
            </Pressable>
            {index < 2 ? <View style={styles.rowDivider} /> : null}
          </View>
        ))}
      </View>

      <SectionHeading title="Workspaces" detail="Move between the operational views your team uses most." />
      <View style={styles.workspaceGrid}>
        <Pressable onPress={() => router.push("/admin-records" as never)} style={({ pressed }) => [styles.workspaceCard, pressed && styles.pressed]}>
          <View style={[styles.workspaceIcon, { backgroundColor: "#E7F5E8" }]}><Ionicons name="people-outline" size={22} color="#28723B" /></View>
          <Text style={styles.workspaceTitle}>Live people</Text><Text style={styles.workspaceDetail}>Customers & sellers</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/admin-delivery")} style={({ pressed }) => [styles.workspaceCard, pressed && styles.pressed]}>
          <View style={[styles.workspaceIcon, { backgroundColor: "#E6F3FF" }]}><Ionicons name="navigate-outline" size={22} color="#1D78C8" /></View>
          <Text style={styles.workspaceTitle}>Delivery desk</Text><Text style={styles.workspaceDetail}>Riders & assignments</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/admin-verification" as never)} style={({ pressed }) => [styles.workspaceCard, pressed && styles.pressed]}>
          <View style={[styles.workspaceIcon, { backgroundColor: "#FFF4CC" }]}><Ionicons name="shield-checkmark-outline" size={22} color="#A76F00" /></View>
          <Text style={styles.workspaceTitle}>Review desk</Text><Text style={styles.workspaceDetail}>Seller verification</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/admin-banners" as never)} style={({ pressed }) => [styles.workspaceCard, pressed && styles.pressed]}>
          <View style={[styles.workspaceIcon, { backgroundColor: "#FFF3C4" }]}><Ionicons name="images-outline" size={22} color="#A76F00" /></View>
          <Text style={styles.workspaceTitle}>Home offers</Text><Text style={styles.workspaceDetail}>Banners & schedules</Text>
        </Pressable>
      </View>
    </ScrollView>
  );

  const renderOrders = () => (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.pageIntro}><Text style={styles.pageKicker}>FULFILMENT</Text><Text style={styles.pageTitle}>Order queue</Text><Text style={styles.pageSubtitle}>Tap an order to update its fulfilment status without leaving the control center.</Text></View>
      <View style={styles.filterRow}><View style={styles.filterPill}><Ionicons name="funnel-outline" size={16} color="#28723B" /><Text style={styles.filterPillText}>All orders</Text></View><Text style={styles.countText}>{orders.length} orders</Text></View>
      <View style={styles.listCard}>
        {orders.map((order, index) => (
          <View key={order.id}>
            <Pressable onPress={() => openOrderStatus(order)} style={({ pressed }) => [styles.orderRowLarge, pressed && styles.pressed]}>
              <View style={styles.orderAvatar}><Text style={styles.orderAvatarText}>{order.customer.charAt(0)}</Text></View>
              <View style={styles.orderCopy}><View style={styles.orderTitleRow}><Text style={styles.orderId}>{order.orderNumber}</Text><Text style={styles.orderDate}>{order.date}</Text></View><Text style={styles.orderCustomer}>{order.customer} · {order.items} items</Text><Text style={styles.orderCustomer}>{order.deliveryDistanceKm == null ? "Route saved with order" : `${order.deliveryDistanceKm.toFixed(1)} km route · ₹${order.shippingCost.toFixed(0)} delivery`}</Text><Text style={styles.orderCustomer}>Payment: {order.paymentStatus}{order.paymentProofUrl ? " · proof uploaded" : " · proof pending"}</Text><View style={styles.orderFooter}><StatusChip label={order.status} /><Text style={styles.orderUpdateLabel}>Update status</Text></View></View>
              <Text style={styles.orderAmount}>₹{order.amount}</Text>
            </Pressable>
            {index < orders.length - 1 ? <View style={styles.rowDivider} /> : null}
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderCatalogue = () => (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.pageIntro}><Text style={styles.pageKicker}>MERCHANDISING</Text><Text style={styles.pageTitle}>Catalogue health</Text><Text style={styles.pageSubtitle}>Watch item availability and keep the shopper-facing selection ready.</Text></View>
      {productsQuery.isError ? (
        <View style={styles.listCard}>
          <Text style={styles.productName}>Showing products currently available in the app</Text>
          <Text style={styles.pageSubtitle}>Admin catalogue access is unavailable, so management controls are disabled. Shopper-visible products are shown below.</Text>
        </View>
      ) : null}
      {productsQuery.isError && shopperProductsQuery.isError ? (
        <View style={styles.listCard}>
          <Text style={styles.productName}>Catalogue could not be loaded</Text>
          <Text style={styles.pageSubtitle}>{getUserFacingError(shopperProductsQuery.error, "Check your connection and try again.")}</Text>
          <Pressable onPress={() => { void productsQuery.refetch(); void shopperProductsQuery.refetch(); }} style={({ pressed }) => [styles.textAction, pressed && styles.pressed]}>
            <Text style={styles.textActionLabel}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
      {canManageProducts ? <Pressable onPress={openProductCreator} style={({ pressed }) => [styles.fullWidthAction, pressed && styles.pressed]}><View style={styles.fullWidthActionIcon}><Ionicons name="add-circle" size={21} color="#14532D" /></View><View style={styles.fullWidthActionCopy}><Text style={styles.fullWidthActionTitle}>Add product to the app</Text><Text style={styles.fullWidthActionText}>Publish an approved product to the live shopper catalogue.</Text></View><Ionicons name="arrow-forward" size={19} color="#14532D" /></Pressable> : null}
      <View style={styles.catalogueSummary}><View><Text style={styles.catalogueSummaryValue}>{products.length}</Text><Text style={styles.catalogueSummaryLabel}>active product records</Text></View><View style={styles.catalogueSummaryDivider} /><View><Text style={[styles.catalogueSummaryValue, { color: "#A76F00" }]}>{lowStockCount}</Text><Text style={styles.catalogueSummaryLabel}>need attention</Text></View><Ionicons name="sparkles" size={24} color="#C88700" /></View>
      <View style={styles.listCard}>
        {products.length === 0 && (productsQuery.isLoading || shopperProductsQuery.isLoading) ? <Text style={styles.pageSubtitle}>Loading catalogue…</Text> : null}
        {products.length === 0 && !productsQuery.isLoading && !shopperProductsQuery.isLoading && (!productsQuery.isError || !shopperProductsQuery.isError) ? <Text style={styles.pageSubtitle}>No products have been added to the catalogue yet.</Text> : null}
        {products.map((product, index) => (
          <View key={product.id}>
            <View style={styles.productRow}>
              <View style={styles.productImage}><Ionicons name="basket-outline" size={23} color="#28723B" /></View>
              <View style={styles.productCopy}><Text style={styles.productName}>{product.name}</Text><Text style={styles.productCategory}>{product.category}{product.builtIn ? " · app built-in" : ""}</Text><View style={styles.productMetaRow}><Text style={styles.productPrice}>₹{product.price}</Text><Text style={styles.productStock}>{product.stock} in stock</Text></View></View>
              <View style={styles.productActions}><StatusChip label={product.status} />{canManageProducts && !product.builtIn ? <><Pressable onPress={() => Alert.alert("Product editor", `Open editing controls for ${product.name}.`)} style={({ pressed }) => [styles.miniIconButton, pressed && styles.pressed]}><Ionicons name="pencil-outline" size={17} color="#28723B" /></Pressable><Pressable onPress={() => removeProduct(product.id, product.name)} style={({ pressed }) => [styles.miniIconButton, styles.dangerButton, pressed && styles.pressed]}><Ionicons name="trash-outline" size={17} color="#B42318" /></Pressable></> : null}</View>
            </View>
            {index < products.length - 1 ? <View style={styles.rowDivider} /> : null}
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderPeople = () => (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.pageIntro}><Text style={styles.pageKicker}>CUSTOMER RELATIONSHIPS</Text><Text style={styles.pageTitle}>People at a glance</Text><Text style={styles.pageSubtitle}>Searchable live records, account controls, and seller approval history are available in the dedicated workspace.</Text></View>
      <Pressable onPress={() => router.push("/admin-records" as never)} style={({ pressed }) => [styles.fullWidthAction, pressed && styles.pressed]}><View style={styles.fullWidthActionIcon}><Ionicons name="people" size={21} color="#14532D" /></View><View style={styles.fullWidthActionCopy}><Text style={styles.fullWidthActionTitle}>Open live people database</Text><Text style={styles.fullWidthActionText}>Search, edit, approve, or pause records.</Text></View><Ionicons name="arrow-forward" size={19} color="#14532D" /></Pressable>
      <SectionHeading title="Recent customer activity" detail="A small sample of the customer base." />
      <View style={styles.listCard}>{people.map((person, index) => <View key={person.id}>{<View style={styles.personRow}><View style={styles.personAvatar}><Text style={styles.personAvatarText}>{person.name.charAt(0)}</Text></View><View style={styles.personCopy}><Text style={styles.personName}>{person.name}</Text><Text style={styles.personEmail}>{person.email}</Text><Text style={styles.personTag}>{person.tag}</Text></View><View style={styles.personOrders}><Text style={styles.personOrdersValue}>{person.orders}</Text><Text style={styles.personOrdersLabel}>orders</Text></View></View>}{index < people.length - 1 ? <View style={styles.rowDivider} /> : null}</View>)}</View>
    </ScrollView>
  );

  const renderSellers = () => (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.pageIntro}><Text style={styles.pageKicker}>SELLER NETWORK</Text><Text style={styles.pageTitle}>Seller desk</Text><Text style={styles.pageSubtitle}>Approve new businesses, then use the verification checklist to review documents and payouts.</Text></View>
      <Pressable onPress={() => router.push("/admin-verification" as never)} style={({ pressed }) => [styles.fullWidthAction, styles.reviewAction, pressed && styles.pressed]}><View style={[styles.fullWidthActionIcon, { backgroundColor: "#FFF3C4" }]}><Ionicons name="shield-checkmark" size={21} color="#8A5A00" /></View><View style={styles.fullWidthActionCopy}><Text style={styles.fullWidthActionTitle}>Open seller review desk</Text><Text style={styles.fullWidthActionText}>{pendingSellerCount} seller profile{pendingSellerCount === 1 ? "" : "s"} waiting for a decision.</Text></View><Ionicons name="arrow-forward" size={19} color="#14532D" /></Pressable>
      <View style={styles.listCard}>{sellers.map((seller, index) => <View key={seller.id}><View style={styles.sellerRow}><View style={styles.sellerAvatar}>{seller.shopLogo ? <Image source={{ uri: seller.shopLogo }} style={styles.sellerLogo} /> : <Ionicons name="storefront" size={21} color="#28723B" />}</View><View style={styles.sellerCopy}><View style={styles.sellerNameRow}><Text style={styles.sellerName}>{seller.name}</Text><StatusChip label={seller.status} /></View><Text style={styles.sellerOwner}>{seller.owner} · {seller.products} products</Text>{seller.shopDescription ? <Text style={styles.sellerDetail} numberOfLines={2}>{seller.shopDescription}</Text> : null}<Text style={styles.sellerDetail}>{seller.address || "Shop address not added"}</Text>{seller.shopHours?.openingTime && seller.shopHours?.closingTime ? <Text style={styles.sellerDetail}>Hours: {seller.shopHours.openingTime}–{seller.shopHours.closingTime}{seller.shopHours.openDays?.length ? ` · ${seller.shopHours.openDays.join(", ")}` : ""}</Text> : null}<View style={styles.sellerRatingRow}><Ionicons name="star" size={14} color="#D69200" /><Text style={styles.sellerRating}>{seller.rating.toFixed(1)} rating</Text></View>{seller.status === "pending" ? <View style={styles.approvalActions}><Pressable onPress={() => updateSellerStatus(seller, "approved")} style={({ pressed }) => [styles.approveButton, pressed && styles.pressed]}><Text style={styles.approveButtonText}>Approve</Text></Pressable><Pressable onPress={() => updateSellerStatus(seller, "rejected")} style={({ pressed }) => [styles.rejectButton, pressed && styles.pressed]}><Text style={styles.rejectButtonText}>Reject</Text></Pressable></View> : null}</View></View>{index < sellers.length - 1 ? <View style={styles.rowDivider} /> : null}</View>)}</View>
    </ScrollView>
  );

  const content = activeTab === "overview" ? renderOverview() : activeTab === "orders" ? renderOrders() : activeTab === "catalogue" ? renderCatalogue() : activeTab === "people" ? renderPeople() : renderSellers();

  return (
    <ScreenContainer className="bg-[#F4F8F0] p-0" containerClassName="bg-[#F4F8F0]">
      <View style={styles.appFrame}>
        <View style={styles.topBar}>
          <View style={styles.brandBlock}><View style={styles.brandMark}><Ionicons name="leaf" size={19} color="#14532D" /></View><View><Text style={styles.brandName}>Ghar Ghar Mart</Text><Text style={styles.brandDescriptor}>ADMIN CONTROL CENTER</Text></View></View>
          <View style={styles.topActions}><Pressable onPress={() => router.push("/admin-delivery")} style={({ pressed }) => [styles.topIconButton, pressed && styles.pressed]}><Ionicons name="navigate-outline" size={21} color="#173C25" /></Pressable><Pressable onPress={handleLogout} style={({ pressed }) => [styles.topIconButton, pressed && styles.pressed]}><Ionicons name="log-out-outline" size={21} color="#B42318" /></Pressable></View>
        </View>

        <View style={styles.tabRail}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRailContent}>
            {TAB_ITEMS.map((tab) => {
              const selected = activeTab === tab.id;
              return <Pressable key={tab.id} onPress={() => setActiveTab(tab.id)} style={({ pressed }) => [styles.tabButton, selected && styles.tabButtonActive, pressed && styles.pressed]}><Ionicons name={tab.icon} size={18} color={selected ? "#14532D" : "#718278"} /><Text style={[styles.tabLabel, selected && styles.tabLabelActive]}>{tab.label}</Text></Pressable>;
            })}
          </ScrollView>
        </View>

        <View style={styles.contentArea}>{content}</View>
      </View>

      <Modal visible={productModal} transparent animationType="slide" onRequestClose={() => setProductModal(false)}>
        <View style={styles.modalBackdrop}><View style={[styles.modalSheet, { maxHeight: "92%" }]}><View style={styles.modalHandle} /><View style={styles.modalHeading}><View><Text style={styles.modalEyebrow}>LIVE CATALOGUE</Text><Text style={styles.modalTitle}>Add product</Text></View><Pressable onPress={() => setProductModal(false)} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}><Ionicons name="close" size={20} color="#173C25" /></Pressable></View><ScrollView showsVerticalScrollIndicator={false}>
          {([ ["Product name", "name", false], ["Description", "description", true], ["Price", "price", false], ["Original price", "originalPrice", false], ["Discount %", "discount", false], ["Stock quantity", "stock", false] ] as const).map(([label, key, multiline]) => <View key={key} style={{ marginTop: 13 }}><Text style={styles.modalFieldLabel}>{label}</Text><TextInput value={productDraft[key]} onChangeText={(value) => setProductDraft((current) => ({ ...current, [key]: value }))} keyboardType={key === "name" || key === "description" ? "default" : "decimal-pad"} multiline={multiline} placeholder={key === "description" ? "Optional shopper-facing description" : label} placeholderTextColor="#9AA79E" style={[styles.modalInput, multiline && { minHeight: 76, textAlignVertical: "top" }]} /></View>)}
          <Text style={[styles.modalFieldLabel, { marginTop: 13 }]}>Approved seller</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 8 }}>{((sellersQuery.data ?? []) as LiveSeller[]).filter((seller) => seller.shopStatus === "approved" && seller.isActive !== false).map((seller) => <Pressable key={seller.id} onPress={() => setProductDraft((current) => ({ ...current, sellerId: String(seller.id) }))} style={[styles.choicePill, productDraft.sellerId === String(seller.id) && styles.choicePillActive]}><Text style={[styles.choicePillText, productDraft.sellerId === String(seller.id) && styles.choicePillTextActive]}>{seller.shopName || seller.name || `Seller #${seller.id}`}</Text></Pressable>)}</ScrollView>
          <Text style={[styles.modalFieldLabel, { marginTop: 13 }]}>Category</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 8 }}>{((categoriesQuery.data ?? []) as LiveCategory[]).filter((category) => category.isActive).map((category) => <Pressable key={category.id} onPress={() => setProductDraft((current) => ({ ...current, categoryId: String(category.id) }))} style={[styles.choicePill, productDraft.categoryId === String(category.id) && styles.choicePillActive]}><Text style={[styles.choicePillText, productDraft.categoryId === String(category.id) && styles.choicePillTextActive]}>{category.name}</Text></Pressable>)}</ScrollView>
          <Pressable onPress={() => setProductDraft((current) => ({ ...current, publishImmediately: !current.publishImmediately }))} style={[styles.publishToggle, productDraft.publishImmediately && styles.publishToggleActive]}><Ionicons name={productDraft.publishImmediately ? "checkmark-circle" : "ellipse-outline"} size={21} color={productDraft.publishImmediately ? "#166534" : "#68776D"} /><View style={{ flex: 1 }}><Text style={styles.publishToggleTitle}>Publish immediately</Text><Text style={styles.publishToggleText}>Approved products appear in the consumer catalogue on the next live refresh.</Text></View></Pressable>
          <Pressable onPress={submitProduct} disabled={createProduct.isPending} style={({ pressed }) => [styles.modalPrimaryButton, { marginTop: 16 }, pressed && styles.pressed, createProduct.isPending && { opacity: 0.6 }]}><Text style={styles.modalPrimaryText}>{createProduct.isPending ? "Publishing…" : "Create product"}</Text><Ionicons name="checkmark" size={18} color="#14532D" /></Pressable>
        </ScrollView></View></View>
      </Modal>

      <Modal visible={orderStatusModal} transparent animationType="slide" onRequestClose={() => setOrderStatusModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeading}><View><Text style={styles.modalEyebrow}>FULFILMENT UPDATE</Text><Text style={styles.modalTitle}>{selectedOrder?.orderNumber}</Text></View><Pressable onPress={() => setOrderStatusModal(false)} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}><Ionicons name="close" size={20} color="#173C25" /></Pressable></View>
            <Text style={styles.modalHelp}>Choose the next status for {selectedOrder?.customer}&apos;s order.</Text>
            {selectedOrder?.paymentProofUrl ? <View style={styles.paymentReviewCard}><Text style={styles.paymentReviewTitle}>Online payment proof uploaded</Text><Pressable onPress={() => void Linking.openURL(selectedOrder.paymentProofUrl!)} style={({ pressed }) => [styles.paymentProofButton, pressed && styles.pressed]}><Text style={styles.paymentProofButtonText}>Open payment screenshot</Text><Ionicons name="open-outline" size={16} color="#14532D" /></Pressable><View style={styles.paymentReviewActions}><Pressable onPress={() => reviewPayment("failed")} style={({ pressed }) => [styles.paymentFailedButton, pressed && styles.pressed]}><Text style={styles.paymentFailedText}>Reject proof</Text></Pressable><Pressable onPress={() => reviewPayment("completed")} style={({ pressed }) => [styles.paymentCompletedButton, pressed && styles.pressed]}><Text style={styles.paymentCompletedText}>Confirm payment</Text></Pressable></View></View> : <Text style={styles.paymentMissingText}>No payment screenshot has been uploaded for this order.</Text>}
            <View style={styles.statusPicker}>{(["pending", "confirmed", "shipped", "delivered", "cancelled"] as OrderStatus[]).map((status) => <Pressable key={status} onPress={() => setNewStatus(status)} style={({ pressed }) => [styles.statusOption, newStatus === status && styles.statusOptionActive, pressed && styles.pressed]}><StatusChip label={status} /><View style={[styles.radioOuter, newStatus === status && styles.radioOuterActive]}>{newStatus === status ? <View style={styles.radioInner} /> : null}</View></Pressable>)}</View>
            <View style={styles.modalActions}><Pressable onPress={() => setOrderStatusModal(false)} style={({ pressed }) => [styles.modalSecondaryButton, pressed && styles.pressed]}><Text style={styles.modalSecondaryText}>Cancel</Text></Pressable><Pressable onPress={confirmStatusUpdate} style={({ pressed }) => [styles.modalPrimaryButton, pressed && styles.pressed]}><Text style={styles.modalPrimaryText}>Save update</Text><Ionicons name="checkmark" size={18} color="#14532D" /></Pressable></View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  appFrame: { flex: 1, width: "100%", alignSelf: "center", maxWidth: 1024 },
  accessGate: { width: "100%", maxWidth: 460, borderRadius: 26, backgroundColor: "#FFFFFF", padding: 22, borderWidth: 1, borderColor: "#E5EEE3" },
  accessGateIcon: { width: 50, height: 50, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#E7F5E8" },
  accessGateTitle: { color: "#173C25", fontSize: 21, fontWeight: "800", marginTop: 17 },
  accessGateText: { color: "#718278", fontSize: 13, lineHeight: 19, marginTop: 8 },
  accessGateButton: { marginTop: 21, borderRadius: 14, paddingVertical: 13, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, backgroundColor: "#FDE68A" },
  accessGateButtonText: { color: "#14532D", fontSize: 13, fontWeight: "800" },
  topBar: { backgroundColor: "#FFFFFF", paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#E5EEE3", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brandBlock: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  brandMark: { width: 38, height: 38, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#FDE68A" },
  brandName: { color: "#173C25", fontSize: 16, fontWeight: "800" },
  brandDescriptor: { color: "#789078", fontSize: 9, fontWeight: "800", letterSpacing: 1.15, marginTop: 2 },
  topActions: { flexDirection: "row", gap: 8 },
  topIconButton: { width: 40, height: 40, borderRadius: 14, backgroundColor: "#F4F8F0", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E5EEE3" },
  tabRail: { backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E5EEE3" },
  tabRailContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  tabButton: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 13 },
  tabButtonActive: { backgroundColor: "#E7F5E8" },
  tabLabel: { color: "#718278", fontSize: 13, fontWeight: "700" },
  tabLabelActive: { color: "#14532D" },
  contentArea: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 42, gap: 16 },
  heroCard: { borderRadius: 28, padding: 22, overflow: "hidden", backgroundColor: "#14532D" },
  heroOrbOne: { position: "absolute", width: 190, height: 190, borderRadius: 95, backgroundColor: "#28723B", right: -68, top: -82, opacity: 0.9 },
  heroOrbTwo: { position: "absolute", width: 132, height: 132, borderRadius: 66, backgroundColor: "#FDE68A", right: 28, bottom: -91, opacity: 0.14 },
  heroTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  eyebrowRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#FDE68A" },
  eyebrowText: { color: "#DDF6E8", fontSize: 10, fontWeight: "800", letterSpacing: 1.5 },
  heroIconButton: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#FDE68A" },
  heroTitle: { color: "#FFFFFF", fontSize: 27, lineHeight: 34, fontWeight: "800", marginTop: 22, maxWidth: 310 },
  heroSubtext: { color: "#DDF6E8", fontSize: 14, lineHeight: 21, marginTop: 8, maxWidth: 410 },
  heroCtaRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 20 },
  primaryHeroButton: { alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, paddingHorizontal: 15, paddingVertical: 12, borderRadius: 14, backgroundColor: "#FDE68A" },
  primaryHeroButtonText: { color: "#14532D", fontSize: 13, fontWeight: "800" },
  heroMetric: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  heroMetricNumber: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  heroMetricLabel: { color: "#DDF6E8", fontSize: 12, fontWeight: "700" },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: { flexGrow: 1, flexBasis: "47%", minWidth: 150, backgroundColor: "#FFFFFF", borderRadius: 20, padding: 15, borderWidth: 1, borderColor: "#E5EEE3" },
  statIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 13 },
  statLabel: { color: "#66796B", fontSize: 12, fontWeight: "600" },
  statValue: { color: "#173C25", fontSize: 22, fontWeight: "800", marginTop: 4 },
  statTrend: { fontSize: 11, fontWeight: "700", marginTop: 4 },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 3 },
  sectionHeadingCopy: { flex: 1, paddingRight: 10 },
  sectionTitle: { color: "#173C25", fontSize: 18, fontWeight: "800" },
  sectionDetail: { color: "#718278", fontSize: 12, lineHeight: 17, marginTop: 3 },
  textAction: { flexDirection: "row", gap: 5, alignItems: "center", paddingVertical: 5 },
  textActionLabel: { color: "#28723B", fontSize: 12, fontWeight: "800" },
  inboxCard: { borderRadius: 20, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5EEE3", overflow: "hidden" },
  inboxRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  inboxIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  inboxCopy: { flex: 1 },
  inboxTitle: { color: "#173C25", fontSize: 13, lineHeight: 18, fontWeight: "800" },
  inboxMeta: { color: "#718278", fontSize: 11, marginTop: 3 },
  rowDivider: { height: 1, backgroundColor: "#EEF3ED", marginLeft: 14, marginRight: 14 },
  listCard: { borderRadius: 20, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5EEE3", overflow: "hidden" },
  orderRow: { flexDirection: "row", alignItems: "center", gap: 11, padding: 14 },
  orderRowLarge: { flexDirection: "row", alignItems: "flex-start", gap: 11, padding: 14 },
  orderAvatar: { width: 40, height: 40, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "#E7F5E8" },
  orderAvatarText: { color: "#28723B", fontSize: 15, fontWeight: "800" },
  orderCopy: { flex: 1, minWidth: 0 },
  orderId: { color: "#173C25", fontSize: 13, fontWeight: "800" },
  orderCustomer: { color: "#718278", fontSize: 11, marginTop: 3 },
  orderValue: { alignItems: "flex-end", gap: 7 },
  orderAmount: { color: "#173C25", fontSize: 14, fontWeight: "800" },
  statusChip: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 4 },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: "800", textTransform: "capitalize" },
  workspaceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  workspaceCard: { flexGrow: 1, flexBasis: "30%", minWidth: 128, borderRadius: 19, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5EEE3", padding: 13 },
  workspaceIcon: { width: 39, height: 39, borderRadius: 13, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  workspaceTitle: { color: "#173C25", fontSize: 13, fontWeight: "800" },
  workspaceDetail: { color: "#718278", fontSize: 10, lineHeight: 14, marginTop: 3 },
  pageIntro: { gap: 5, marginBottom: 2 },
  pageKicker: { color: "#28723B", fontSize: 10, fontWeight: "800", letterSpacing: 1.4 },
  pageTitle: { color: "#173C25", fontSize: 27, lineHeight: 33, fontWeight: "800" },
  pageSubtitle: { color: "#718278", fontSize: 13, lineHeight: 19, maxWidth: 540 },
  filterRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  filterPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 11, backgroundColor: "#E7F5E8" },
  filterPillText: { color: "#28723B", fontSize: 12, fontWeight: "800" },
  countText: { color: "#718278", fontSize: 12, fontWeight: "700" },
  orderTitleRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  orderDate: { color: "#8A9A8D", fontSize: 10, textAlign: "right", flexShrink: 1 },
  orderFooter: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  orderUpdateLabel: { color: "#28723B", fontSize: 10, fontWeight: "800" },
  catalogueSummary: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#14532D", borderRadius: 21, padding: 17 },
  catalogueSummaryValue: { color: "#FFFFFF", fontSize: 25, fontWeight: "800" },
  catalogueSummaryLabel: { color: "#DDF6E8", fontSize: 11, marginTop: 2 },
  catalogueSummaryDivider: { width: 1, height: 38, backgroundColor: "#3E8A50", marginHorizontal: 8 },
  productRow: { flexDirection: "row", alignItems: "center", gap: 11, padding: 14 },
  productImage: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "#E7F5E8" },
  productCopy: { flex: 1, minWidth: 0 },
  productName: { color: "#173C25", fontSize: 13, fontWeight: "800" },
  productCategory: { color: "#718278", fontSize: 10, marginTop: 2 },
  productMetaRow: { flexDirection: "row", gap: 8, alignItems: "center", marginTop: 7 },
  productPrice: { color: "#28723B", fontSize: 12, fontWeight: "800" },
  productStock: { color: "#718278", fontSize: 10 },
  productActions: { alignItems: "flex-end", gap: 6 },
  miniIconButton: { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "#E7F5E8" },
  dangerButton: { backgroundColor: "#FDE7E7" },
  fullWidthAction: { backgroundColor: "#E7F5E8", borderRadius: 20, padding: 14, flexDirection: "row", alignItems: "center", gap: 11 },
  reviewAction: { backgroundColor: "#FFF9E4" },
  fullWidthActionIcon: { width: 41, height: 41, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#FDE68A" },
  fullWidthActionCopy: { flex: 1 },
  fullWidthActionTitle: { color: "#173C25", fontSize: 13, fontWeight: "800" },
  fullWidthActionText: { color: "#597060", fontSize: 11, marginTop: 3 },
  personRow: { flexDirection: "row", alignItems: "center", gap: 11, padding: 14 },
  personAvatar: { width: 40, height: 40, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "#E6F3FF" },
  personAvatarText: { color: "#1D78C8", fontSize: 15, fontWeight: "800" },
  personCopy: { flex: 1 },
  personName: { color: "#173C25", fontSize: 13, fontWeight: "800" },
  personEmail: { color: "#718278", fontSize: 10, marginTop: 2 },
  personTag: { color: "#28723B", fontSize: 10, fontWeight: "700", marginTop: 4 },
  personOrders: { alignItems: "flex-end" },
  personOrdersValue: { color: "#173C25", fontSize: 18, fontWeight: "800" },
  personOrdersLabel: { color: "#718278", fontSize: 10 },
  sellerRow: { flexDirection: "row", gap: 11, padding: 14 },
  sellerAvatar: { width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "#E7F5E8" },
  sellerLogo: { width: 42, height: 42, borderRadius: 15 },
  sellerCopy: { flex: 1 },
  sellerNameRow: { flexDirection: "row", justifyContent: "space-between", gap: 8, alignItems: "flex-start" },
  sellerName: { color: "#173C25", fontSize: 13, fontWeight: "800", flex: 1 },
  sellerOwner: { color: "#718278", fontSize: 11, marginTop: 3 },
  sellerDetail: { color: "#58705E", fontSize: 11, lineHeight: 16, marginTop: 5 },
  sellerRatingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 7 },
  sellerRating: { color: "#8A6B19", fontSize: 11, fontWeight: "700" },
  approvalActions: { flexDirection: "row", gap: 8, marginTop: 12 },
  approveButton: { backgroundColor: "#28723B", borderRadius: 10, paddingHorizontal: 13, paddingVertical: 8 },
  approveButtonText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  rejectButton: { backgroundColor: "#FDE7E7", borderRadius: 10, paddingHorizontal: 13, paddingVertical: 8 },
  rejectButtonText: { color: "#B42318", fontSize: 11, fontWeight: "800" },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(10, 32, 16, 0.48)" },
  modalSheet: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, paddingBottom: 28 },
  modalHandle: { alignSelf: "center", width: 38, height: 4, borderRadius: 2, backgroundColor: "#D9E4D8", marginBottom: 16 },
  modalHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalEyebrow: { color: "#28723B", fontSize: 10, fontWeight: "800", letterSpacing: 1.3 },
  modalTitle: { color: "#173C25", fontSize: 22, fontWeight: "800", marginTop: 3 },
  closeButton: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#F4F8F0" },
  modalHelp: { color: "#718278", fontSize: 13, lineHeight: 19, marginTop: 9 },
  statusPicker: { gap: 8, marginTop: 18 },
  statusOption: { borderRadius: 14, borderWidth: 1, borderColor: "#E5EEE3", padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusOptionActive: { borderColor: "#28723B", backgroundColor: "#F2F9F1" },
  radioOuter: { width: 19, height: 19, borderRadius: 10, borderWidth: 2, borderColor: "#B5C5B6", alignItems: "center", justifyContent: "center" },
  radioOuterActive: { borderColor: "#28723B" },
  radioInner: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#28723B" },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 20 },
  modalSecondaryButton: { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 13, borderWidth: 1, borderColor: "#DCE8DA", paddingVertical: 13 },
  modalSecondaryText: { color: "#597060", fontSize: 13, fontWeight: "800" },
  modalPrimaryButton: { flex: 1.25, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7, borderRadius: 13, backgroundColor: "#FDE68A", paddingVertical: 13 },
  modalPrimaryText: { color: "#14532D", fontSize: 13, fontWeight: "800" },
  modalFieldLabel: { color: "#68776D", fontSize: 10, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" },
  modalInput: { marginTop: 6, borderWidth: 1, borderColor: "#DCE9D9", borderRadius: 14, backgroundColor: "#F9FCF8", paddingHorizontal: 13, paddingVertical: 11, color: "#173C25", fontSize: 14 },
  choicePill: { borderWidth: 1, borderColor: "#DCE9D9", borderRadius: 12, backgroundColor: "#F9FCF8", paddingHorizontal: 12, paddingVertical: 9 },
  choicePillActive: { borderColor: "#2E7D32", backgroundColor: "#DCFCE7" },
  choicePillText: { color: "#68776D", fontSize: 11, fontWeight: "700" },
  choicePillTextActive: { color: "#166534" },
  publishToggle: { marginTop: 16, flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 16, backgroundColor: "#F4F8F0", padding: 13 },
  publishToggleActive: { backgroundColor: "#DCFCE7" },
  publishToggleTitle: { color: "#173C25", fontSize: 12, fontWeight: "800" },
  publishToggleText: { color: "#68776D", fontSize: 11, lineHeight: 16, marginTop: 2 },
  pricingCard: { marginTop: 18, borderRadius: 22, borderWidth: 1, borderColor: "#DCE9D9", backgroundColor: "#FFFFFF", padding: 16 },
  pricingHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  pricingTitle: { color: "#173C25", fontSize: 17, fontWeight: "800" },
  pricingDetail: { color: "#718278", fontSize: 11, lineHeight: 16, marginTop: 3 },
  pricingFormula: { color: "#58705E", fontSize: 10, lineHeight: 16, marginTop: 11 },
  paymentReviewCard: { marginTop: 15, borderRadius: 14, backgroundColor: "#F4F8F0", padding: 12 },
  paymentReviewTitle: { color: "#173C25", fontSize: 12, fontWeight: "800" },
  paymentProofButton: { alignItems: "center", flexDirection: "row", gap: 6, marginTop: 9 },
  paymentProofButtonText: { color: "#14532D", fontSize: 11, fontWeight: "800" },
  paymentReviewActions: { flexDirection: "row", gap: 8, marginTop: 11 },
  paymentFailedButton: { flex: 1, alignItems: "center", borderRadius: 10, backgroundColor: "#FDE7E7", paddingVertical: 9 },
  paymentFailedText: { color: "#B42318", fontSize: 11, fontWeight: "800" },
  paymentCompletedButton: { flex: 1, alignItems: "center", borderRadius: 10, backgroundColor: "#DCFCE7", paddingVertical: 9 },
  paymentCompletedText: { color: "#166534", fontSize: 11, fontWeight: "800" },
  paymentMissingText: { color: "#B42318", fontSize: 11, marginTop: 13 },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});
