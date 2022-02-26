import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productIndex = cart.reduce((previousValue, currentValue, currentIndex) => {
        if (currentValue.id === productId) {
          return currentIndex
        }
        return previousValue
      }, -1)

      const productStockResponse = await api.get(`/stock/${productId}`)
      const productStock: Stock = productStockResponse.data

      if (productIndex === -1) {
        if (productStock.amount === 0) {
          toast.error('Erro na adição do produto')
          return
        }        

        const productResponse = await api.get(`/products/${productId}`)
        const product = productResponse.data

        const newCartProduct = {
          ...product,
          amount: 1
        }

        const newCart = [...cart, newCartProduct]

        setCart([...newCart])

        localStorage.setItem('@RocketShoes:cart', JSON.stringify([...newCart]))
      } else {
        if (cart[productIndex].amount + 1 > productStock.amount) {
          toast.error('Quantidade solicitada fora de estoque')
          return
        }

        cart[productIndex].amount += 1

        setCart([...cart])

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
      }

    } catch {
      toast.error('Erro na adição do produto')
    }
  }

  const removeProduct = (productId: number) => {
    try {
      const productIndex = cart.reduce((previousValue, currentValue, currentIndex, array) => {
        if (currentValue.id === productId) {
          return currentIndex
        }
        return previousValue
      }, -1)

      if (productIndex !== -1) {
        const newCart = cart.filter((value, index) => {
          if (index === productIndex) return false
          return true
        })

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))

        setCart([...newCart])
      } else {
        toast.error('Erro na remoção do produto');
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 1) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }
      const response = await api.get(`/stock/${productId}`)
      const productStock: Stock = response.data

      if (amount <= productStock.amount) {
        const newCart = cart.map((product: Product) => {
          if (product.id === productId) {
            product.amount = amount
          }
          return product
        })

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))

        setCart([...newCart])

      } else {
        toast.error('Quantidade solicitada fora de estoque')
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto')
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
