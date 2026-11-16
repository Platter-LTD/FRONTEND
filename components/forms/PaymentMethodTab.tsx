"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { BankTransferPaymentDrawer } from "@/components/BankTransferPaymentDrawer";
import { CardPaymentDrawer } from "@/components/CardPaymentDrawer";
import { AddCardDrawer } from "@/components/AddCardDrawer";
import { PaymentCard } from "@/app/types/payment";
import { Card } from "@/components/ui/card";
import { FaCircleArrowRight } from "react-icons/fa6";
import { MdOutlineAddCard } from "react-icons/md";
import { CardAddedDrawer } from "@/components/CardAddedDrawer";
import { toast } from "react-toastify";
import { useOneTimeBillings } from "@/hooks/queries/billing";
import { usePaymentActions, usePaymentMethods } from "@/hooks/queries/payments";

const DEFAULT_BILL = { amount: 10000, status: "Pending", upcomingAmount: 10000, dueDate: "24 Sep, 2025" };

export function PaymentMethodTab() {
  const [cardDrawerOpen, setCardDrawerOpen] = useState(false);
  const [bankDrawerOpen, setBankDrawerOpen] = useState(false);
  const [addCardDrawerOpen, setAddCardDrawerOpen] = useState(false);
  const [cardAddedDrawerOpen, setCardAddedDrawerOpen] = useState(false);
  const [addedCardNumber, setAddedCardNumber] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Current bill state
  const billingQuery = useOneTimeBillings({ limit: 1 });
  const currentBill = useMemo(() => {
    const bill = billingQuery.data?.success ? billingQuery.data.data?.[0] : undefined;
    if (!bill) return DEFAULT_BILL;
    return {
      amount: bill.amount || 10000,
      status: bill.status || "Pending",
      upcomingAmount: bill.amount || 10000,
      dueDate: bill.dueDate ? new Date(bill.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : "24 Sep, 2025"
    };
  }, [billingQuery.data]);

  // Bank transfer details from API
  const [bankDetails, setBankDetails] = useState({
    accountNumber: "",
    accountName: "",
    bankName: "",
  });
  const [paymentReference, setPaymentReference] = useState<string | null>(null);

  // Saved cards from API
  const methodsQuery = usePaymentMethods();
  const paymentActions = usePaymentActions();
  const isLoading = methodsQuery.isLoading;
  // Saved card methods → display cards.
  const cards: PaymentCard[] = useMemo(
    () =>
      methodsQuery.data?.success && methodsQuery.data.data
        ? methodsQuery.data.data
            .filter((method: any) => method.type === 'card')
            .map((method: any) => ({
              id: method.id,
              brand: method.cardBrand?.toLowerCase() === 'mastercard' ? 'mastercard' : 'visa',
              number: method.cardLast4 ? `****${method.cardLast4}` : '****',
              name: method.cardholderName || 'Card Holder',
              expiryDate: method.cardExpMonth && method.cardExpYear
                ? `${String(method.cardExpMonth).padStart(2, '0')}/${String(method.cardExpYear).slice(-2)}`
                : '**/**',
              isDefault: method.isDefault,
            }))
        : [],
    [methodsQuery.data],
  );

  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  // Load payment methods and billing info on mount
  // Handle card payment
  const handleCardPayment = async () => {
    if (!selectedCard) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const response = await paymentActions.initiateCardPayment({
        amount: currentBill.amount,
        currency: 'NGN',
        cardNumber: '', // Card is already saved, using saved card ID
        expiryMonth: '',
        expiryYear: '',
        cvv: '',
        cardholderName: '',
        description: `Bill payment - ${currentBill.amount}`,
        metadata: { paymentMethodId: selectedCard }
      });
      
      if (response.success) {
        // Payment successful
        setCardDrawerOpen(false);
        toast.success('Payment successful! 🎉');
        void billingQuery.refetch(); // Refresh billing info
      } else {
        setError(response.error || 'Payment failed');
        toast.error(`Payment failed: ${response.error}`);
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment failed');
      toast.error(`Payment error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle bank transfer initiation
  const handleInitiateBankTransfer = async () => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const response = await paymentActions.initiateBankTransfer({
        amount: currentBill.amount,
        currency: 'NGN',
        description: `Bill payment - ${currentBill.amount}`,
      });
      
      if (response.success && response.data) {
        const { bankDetails: apiDetails, payment } = response.data;
        setBankDetails({
          accountNumber: apiDetails.accountNumber,
          accountName: apiDetails.accountName,
          bankName: apiDetails.bankName,
        });
        setPaymentReference(payment.reference);
        setBankDrawerOpen(true);
      } else {
        // Fallback to default bank details if API fails
        setBankDetails({
          accountNumber: "1234567890",
          accountName: "PLATA Limited",
          bankName: "Access Bank",
        });
        setBankDrawerOpen(true);
      }
    } catch (err: any) {
      console.error('Bank transfer initiation error:', err);
      // Fallback to default bank details
      setBankDetails({
        accountNumber: "1234567890",
        accountName: "PLATA Limited",
        bankName: "Access Bank",
      });
      setBankDrawerOpen(true);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle bank transfer confirmation
  const handleBankTransferPaid = async () => {
    if (paymentReference) {
      try {
        const response = await paymentActions.verifyPayment({
          reference: paymentReference,
        });
        
        if (response.success && response.data?.verified) {
          // Bank transfer verified
          toast.success('Payment verified successfully! ✅');
          void billingQuery.refetch();
        } else {
          toast.info('Payment verification pending. We will confirm once the transfer is received.', { autoClose: 5000 });
        }
      } catch (err) {
        console.error('Verification error:', err);
        toast.info('Payment verification pending. We will confirm once the transfer is received.', { autoClose: 5000 });
      }
    } else {
      toast.info('Payment notification sent. We will confirm once the transfer is received.', { autoClose: 5000 });
    }
    setBankDrawerOpen(false);
  };

  // Handle adding new card
  const handleAddCard = async (newCard: { cardNumber: string; cardName: string; expiry: string; cvv: string }) => {
    setIsProcessing(true);
    
    try {
      const [expiryMonth, expiryYear] = newCard.expiry.split('/');
      
      const response = await paymentActions.addPaymentMethod({
        type: 'card',
        cardNumber: newCard.cardNumber,
        expiryMonth,
        expiryYear: expiryYear.length === 2 ? `20${expiryYear}` : expiryYear,
        cardholderName: newCard.cardName,
        setAsDefault: false,
      });
      
      if (response.success) {
        // Reload cards from API to get the correctly formatted card
        setAddCardDrawerOpen(false);
        setAddedCardNumber(`****${newCard.cardNumber.slice(-4)}`);
        setCardAddedDrawerOpen(true);
      } else {
        toast.error(`Failed to add card: ${response.error}`);
      }
    } catch (err: any) {
      console.error('Add card error:', err);
      toast.error('Failed to add card. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle removing a card
  const handleRemoveCard = async (cardId: string) => {
    try {
      const response = await paymentActions.deletePaymentMethod(cardId);
      if (response.success) {
        // Remove card from local state
        // Clear selection if this was the selected card
        if (selectedCard === cardId) {
          setSelectedCard(null);
        }
        toast.success('Card removed successfully');
      } else {
        toast.error('Failed to remove card');
      }
    } catch (err: any) {
      console.error('Remove card error:', err);
      toast.error('Failed to remove card');
    }
  };

  return (
    <div className="p-6 space-y-12">
      {/* Current Bill */}
      <Card className="bg-black text-[#98A2B3] rounded-xl p-8">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <p className="text-1xl">Current Bill</p>
            <p className="text-1xl font-medium">Amount ₦{currentBill.amount.toLocaleString()}</p>
            <p>
              Status &nbsp;&nbsp;&nbsp;
              <span className={`text-xs px-2 py-1 rounded-full ${
                currentBill.status === 'Pending' 
                  ? 'bg-[#FCE7E1] text-[#C65A35]' 
                  : currentBill.status === 'Paid'
                  ? 'bg-green-100 text-green-600'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {currentBill.status}
              </span>
            </p>
          </div>
          <div className="text-right text-1xl text-[#98A2B3] space-y-2">
            <p>Upcoming Bills</p>
            <p className="font-medium">₦{currentBill.upcomingAmount.toLocaleString()}</p>
            <p>Due {currentBill.dueDate}</p>
          </div>
        </div>
      </Card>

      {/* Payment Actions */}
      <div className="flex justify-between items-center">
        <div className="flex gap-3">
          {/* Pay via Bank Transfer */}
          <Button
            className="bg-[#E0D8C3] text-[#9A813F] font-light hover:bg-[#d5cdb8] flex items-center gap-2 rounded-lg"
            onClick={handleInitiateBankTransfer}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Pay via Bank Transfer'}
            <FaCircleArrowRight />
          </Button>
        </div>

        {/* View Invoice */}
        <Button
          variant="outline"
          size="sm"
          className="bg-white text-black border rounded-lg shadow-sm hover:bg-gray-50 font-light flex items-center gap-2"
        >
          View Invoice
          <FileText className="w-4 h-4 text-[#9A813F]" />
        </Button>
      </div>

      {/* Saved Cards Section */}
      <div>
        <h2 className="text-base font-medium mb-4">Cards</h2>
        {isLoading ? (
          <p className="text-gray-500">Loading cards...</p>
        ) : (
          <div className="flex items-center gap-[90px] flex-wrap">
            {/* Display saved cards */}
            {cards.length > 0 ? cards.map((card, index) => (
              <img
                key={card.id}
                src={card.brand === 'mastercard' ? "/images/mastercard.png" : "/images/visa.png"}
                alt={card.brand}
                className="w-[430px] h-[295px] object-contain"

              />
            )) : (
              <>
                {/* Default card images when no cards saved */}
                <img
                  src="/images/mastercard.png"
                  alt="Mastercard"
                  className="w-[430px] h-[295px] object-contain opacity-50"
                />
                <img
                  src="/images/visa.png"
                  alt="Visa"
                  className="w-[430px] h-[295px] object-contain opacity-50"
                />
              </>
            )}

            {/* Add Card */}
            <div
              onClick={() => setAddCardDrawerOpen(true)}
              className="w-[400px] h-[235px] rounded-2xl border-2 border-dashed border-yellow-700 flex flex-col items-center justify-center cursor-pointer text-yellow-700 hover:bg-yellow-50 transition"
            >
              <MdOutlineAddCard className="w-12 h-12" />
              <p className="font-medium">Add new card</p>
            </div>
          </div>
        )}
      </div>

      {/* Add Card Drawer */}
      <AddCardDrawer
        open={addCardDrawerOpen}
        onOpenChange={setAddCardDrawerOpen}
        onSubmit={handleAddCard}
      />

      <CardAddedDrawer
        open={cardAddedDrawerOpen}
        onOpenChange={setCardAddedDrawerOpen}
        cardNumber={addedCardNumber}
      />

      {/* Bank Drawer */}
      <BankTransferPaymentDrawer
        open={bankDrawerOpen}
        onOpenChange={setBankDrawerOpen}
        bankDetails={bankDetails}
        onPay={handleBankTransferPaid}
      />
    </div>
  );
}
