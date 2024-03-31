import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { DataSource, Repository } from 'typeorm';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { validate as isUUID } from 'uuid';
import { ProductImage } from './entities';

@Injectable()
export class ProductsService {

  private readonly logger = new Logger('ProductsService');
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,

    private readonly dataSource: DataSource,

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
      const {images= [], ...productDetails} = createProductDto
      const product = this.productRepository.create({
        ...productDetails,
        images: images.map(image=> this.productImageRepository.create({url: image}))
      });
      await this.productRepository.save(product);

      return {...product, images}
    } catch (error) {
      this.handleDBExceptions(error)
      
    }
    
  }

  async findAll(paginationDto: PaginationDto) {
    const {limit=10, offset=0}= paginationDto
    const products = await this.productRepository.find({
      take: limit,
      skip: offset,
      relations: {
        images: true
      }
      
    })

    return products.map(({images, ...rest}) => ({
      ...rest,
      images: images.map(img => img.url)
    }))
  }

  async findOne(term: string) {
    let product: Product;

    if(isUUID(term)){
      product = await this.productRepository.findOneBy({id: term})
    }else{
      //Con este query builder podemos buscar nuestro producto por titulo y slug sin que nos hagan inyeccion de dependencia a nuestra base de datos le mandamos en el where el title en UPPER para que pueda aceptar ambas terminos e igual nos da el resultadod el producto
      const queryBuilder= this.productRepository.createQueryBuilder('Product')
      product = await queryBuilder
      .where(`UPPER(title) =:title or slug =:slug`,{
        title: term.toUpperCase(),
        slug: term.toLowerCase()
      })
      .leftJoinAndSelect('Product.images','ProductImages')
      .getOne();

    }
  
    if(!product){
      throw new NotFoundException(`Product with term "${term}" not found`)
  }

  return product
}
  
async findOnePlain(term:string){
  const {images=[], ...rest} = await this.findOne(term)
  return {
    ...rest,
    images: images.map(img => img.url)

  }
}

  async update(id: string, updateProductDto: UpdateProductDto) {

    const {images, ...toUpdate}=updateProductDto
    
    const product = await this.productRepository.preload({
      id,
      ...toUpdate
    })
    
    if(!product) throw new NotFoundException(`Product with id "${id}" not found`);

    //Create Query Runner

    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if(images){
        await queryRunner.manager.delete(ProductImage,{product: {id}})
        product.images = images.map(image=> this.productImageRepository.create({url: image}))
      }
      await queryRunner.manager.save(product)

      // await this.productRepository.save(product)
      await queryRunner.commitTransaction()
      await queryRunner.release()
      return this.findOnePlain(id)
      
    } catch (error) {
      await queryRunner.rollbackTransaction()
      await queryRunner.release()
      this.handleDBExceptions(error)
    }


  }

  async remove(id: string) {
    const product = await this.findOne(id)
    await this.productRepository.remove(product)
    
  }

  private handleDBExceptions(error: any){
    if (error.code === '23505') {
      throw new BadRequestException(error.detail)
    }
    this.logger.error(error)
    throw new InternalServerErrorException('Unexpected error, check server logs')

  }

  async deleteAllProducts(){
    const query = this.productRepository.createQueryBuilder('product')

    try {
      return await query
      .delete()
      .where({})
      .execute();
    } catch (error) {
      this.handleDBExceptions(error)
    }
  }
}
