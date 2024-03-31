import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Repository } from 'typeorm';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { validate as isUUID } from 'uuid';

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

  findAll(paginationDto: PaginationDto) {
    const {limit=10, offset=0}= paginationDto
    return this.producRepository.find({
      take: limit,
      skip: offset,
      //Todo: relaciones
    })
  }

  async findOne(term: string) {
    let product: Product;

    if(isUUID(term)){
      product = await this.producRepository.findOneBy({id: term})
    }else{
      //Con este query builder podemos buscar nuestro producto por titulo y slug sin que nos hagan inyeccion de dependencia a nuestra base de datos le mandamos en el where el title en UPPER para que pueda aceptar ambas terminos e igual nos da el resultadod el producto
      const queryBuilder= this.producRepository.createQueryBuilder()
      product = await queryBuilder
      .where(`UPPER(title) =:title or slug =:slug`,{
        title: term.toUpperCase(),
        slug: term.toLowerCase()
      }).getOne();

    }
  
    if(!product){
      throw new NotFoundException(`Product with term "${term}" not found`)
  }

  return product
}
  

  async update(id: string, updateProductDto: UpdateProductDto) {
    
    const product = await this.producRepository.preload({
      id: id,
      ...updateProductDto,
    })
    
    if(!product) throw new NotFoundException(`Product with id "${id}" not found`);
    try {
      await this.producRepository.save(product)
      return product
      
    } catch (error) {
      this.handleDBExceptions(error)
    }


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
