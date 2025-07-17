interface Reservation {
  id: string;
  total_amount: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
  unit: string;
}

interface RoomConsumption {
  id: string;
  reservation_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  status: 'pending' | 'billed' | 'paid' | 'cancelled';
  product: Product;
}

interface CheckoutSummaryProps {
  reservation: Reservation;
  consumptions: RoomConsumption[];
}

export default function CheckoutSummary({ reservation, consumptions }: CheckoutSummaryProps) {
  const totalConsumptions = consumptions.reduce((sum, c) => sum + c.total_amount, 0);
  const totalAmount = reservation.total_amount + totalConsumptions;
  
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-600">Valor da Estadia:</span>
          <span className="font-medium">
            R$ {reservation.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Consumos:</span>
          <span className="font-medium">
            R$ {totalConsumptions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
        
        <div className="border-t pt-3 flex justify-between">
          <span className="text-gray-800 font-medium">Total:</span>
          <span className="text-xl font-bold text-primary-600">
            R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
      
      {consumptions.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Detalhamento dos Consumos</h4>
          <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="pb-2">Item</th>
                  <th className="pb-2">Qtd</th>
                  <th className="pb-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {consumptions.map(consumption => (
                  <tr key={consumption.id} className="border-t border-gray-200">
                    <td className="py-2">{consumption.product.name}</td>
                    <td className="py-2">{consumption.quantity}</td>
                    <td className="py-2 text-right">
                      R$ {consumption.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}