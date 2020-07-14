import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    // TODO
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer not found.');
    }

    const productsIds = products.map(product => {
      return { id: product.id };
    });

    const dbProducts = await this.productsRepository.findAllById(productsIds);

    if (dbProducts.length !== products.length) {
      throw new AppError('Missing product in list');
    }

    const productsWithPrice = products.map(product => {
      const productInStock = dbProducts.find(prod => prod.id === product.id);

      if (!productInStock) {
        throw new AppError('Product not found');
      }

      if (product.quantity > productInStock.quantity) {
        throw new AppError('Not enough product in stock');
      }

      return {
        product_id: product.id,
        quantity: product.quantity,
        price: productInStock.price,
      };
    });

    const newOrder = this.ordersRepository.create({
      customer,
      products: productsWithPrice,
    });

    await this.productsRepository.updateQuantity(products);

    return newOrder;
  }
}

export default CreateOrderService;
