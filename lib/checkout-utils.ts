import { getLocalISOString } from './utils';

export interface CheckoutPricingResult {
  isLate: boolean;
  isImminent: boolean;
  hoursExceeded: number;
  originalNights: number;
  currentNights: number;
  extraNights: number;
  originalStayAmount: number;
  recalculatedStayAmount: number;
  lateCheckoutFee: number;
  pricePerNight: number;
  hoursUntilCheckout: number;
}

/**
 * Calcula dinamicamente os valores de cobrança da estadia considerando as regras de check-out tardio.
 * 
 * Regras:
 * - Tolerância de 2 horas gratuita.
 * - De 0 a 4 horas após a tolerância: cobrança proporcional fracionada (1/12 da diária por hora ultrapassada).
 * - Mais de 4 horas após a tolerância: cobrança de 1 diária cheia adicional.
 */
export function calculateCheckoutPricing(
  checkInDateStr: string,
  checkOutDateStr: string,
  checkOutTimeStr: string, // Ex: '12:00:00' ou '12:00'
  pricePerNight: number,
  originalTotalAmount: number,
  timezone: string = 'America/Sao_Paulo'
): CheckoutPricingResult {
  // Validação defensiva caso as datas não estejam definidas
  if (!checkInDateStr || !checkOutDateStr) {
    return {
      isLate: false,
      isImminent: false,
      hoursExceeded: 0,
      originalNights: 1,
      currentNights: 1,
      extraNights: 0,
      originalStayAmount: originalTotalAmount,
      recalculatedStayAmount: originalTotalAmount,
      lateCheckoutFee: 0,
      pricePerNight,
      hoursUntilCheckout: 999
    };
  }

  // Obter hora local atual
  const localIso = getLocalISOString(timezone);
  const now = new Date(localIso);

  const checkInDate = new Date(checkInDateStr + 'T00:00:00');
  const scheduledCheckOutDate = new Date(checkOutDateStr + 'T00:00:00');
  
  // Tratar formato da hora de check-out (remover segundos se houver)
  const timeClean = checkOutTimeStr ? checkOutTimeStr.slice(0, 5) : '12:00';
  const [hours, minutes] = timeClean.split(':').map(Number);
  
  // Combinar data prevista com horário previsto
  const scheduledCheckOutDateTime = new Date(scheduledCheckOutDate);
  scheduledCheckOutDateTime.setHours(hours, minutes, 0, 0);
  
  // Limite de tolerância (Vencimento + 2 horas)
  const gracePeriodDateTime = new Date(scheduledCheckOutDateTime.getTime() + 2 * 60 * 60 * 1000);
  
  // Diferença em milissegundos
  const diffFromScheduled = scheduledCheckOutDateTime.getTime() - now.getTime();
  const hoursUntilCheckout = diffFromScheduled / (1000 * 60 * 60);
  
  // Flag de Check-out Iminente (se faltar 4 horas ou menos para o horário limite do check-out previsto, e ainda não tiver passado dele)
  const isImminent = hoursUntilCheckout >= 0 && hoursUntilCheckout <= 4;
  
  // Calcular noites originais planejadas
  const originalDays = Math.ceil((scheduledCheckOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
  const originalNights = Math.max(1, originalDays);
  
  let currentNights = originalNights;
  let isLate = false;
  let hoursExceeded = 0;
  let lateCheckoutFee = 0;
  let extraNights = 0;
  
  // Se ultrapassou o limite de tolerância de 2 horas
  if (now > gracePeriodDateTime) {
    isLate = true;
    
    // Obter o atraso em relação ao final da tolerância (grace period)
    const delayMs = now.getTime() - gracePeriodDateTime.getTime();
    const delayHours = delayMs / (1000 * 60 * 60);
    
    // Arredondar para cima para pegar frações de hora
    hoursExceeded = Math.ceil(delayHours);
    
    if (hoursExceeded <= 4) {
      // Cobrança proporcional: 1/12 da diária por hora excedida
      const hourlyRate = pricePerNight / 12;
      lateCheckoutFee = parseFloat((hoursExceeded * hourlyRate).toFixed(2));
      currentNights = originalNights; // Mantém noites originais, adicionamos a taxa extra
    } else {
      // Passou de 4 horas extras além do limite de tolerância: cobra-se 1 diária inteira cheia
      lateCheckoutFee = pricePerNight;
      extraNights = 1;
      currentNights = originalNights + 1;
    }
  }
  
  const recalculatedStayAmount = originalTotalAmount + lateCheckoutFee;
  
  return {
    isLate,
    isImminent,
    hoursExceeded,
    originalNights,
    currentNights,
    extraNights,
    originalStayAmount: originalTotalAmount,
    recalculatedStayAmount,
    lateCheckoutFee,
    pricePerNight,
    hoursUntilCheckout
  };
}
