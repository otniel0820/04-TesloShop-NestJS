import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Repository } from 'typeorm';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Injectable()
export class ProductsService {

  private readonly logger = new Logger('ProductsService');
  constructor(
    @InjectRepository(Product)
    private readonly producRepository: Repository<Product>
  ){}


  async create(createProductDto: CreateProductDto) {
    
    try {

      //Este codigo se hace para hacer la validacion de que si el slug no es mandado tome lo mismo que viene en el title que es requerido pero como nest y typeorm nos proveen ya una forma mas sencilla se aplica directamente la validacion al final de la entidad como un metodo y un decorador
      // if (!createProductDto.slug) {
      //   createProductDto.slug = createProductDto.title
      //   .toLowerCase()
      //   .replaceAll(' ', '_')
      //   .replaceAll("'", '');
      // }else{
      //   createProductDto.slug = createProductDto.slug
      //   .toLowerCase()
      //   .replaceAll(' ', '_')
      //   .replaceAll("'", '');
      // }
      const product = this.producRepository.create(createProductDto);
      await this.producRepository.save(product);

      return product
    } catch (error) {
      this.handleDBExceptions(error)
      
    }
    
  }

  //Todo: pagination
  findAll(paginationDto: PaginationDto) {
    const {limit=10, offset=0}= paginationDto
    return this.producRepository.find({
      take: limit,
      skip: offset,
      //Todo: relaciones
    })
  }

  async findOne(id: string) {
    
    const product = await this.producRepository.findOneBy({id})
    if(!product){
      throw new NotFoundException(`Product with id "${id}" not found`)
  }

  return product
}
  

  update(id: number, updateProductDto: UpdateProductDto) {
    return `This action updates a #${id} product`;
  }

  async remove(id: string) {
    const product = await this.findOne(id)
    await this.producRepository.remove(product)
    
  }

  private handleDBExceptions(error: any){
    if (error.code === '23505') {
      throw new BadRequestException(error.detail)
    }
    this.logger.error(error)
    throw new InternalServerErrorException('Unexpected error, check server logs')

  }
}
