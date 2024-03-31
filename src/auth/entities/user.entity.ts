import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";


@Entity('users')
export class User {

    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('text',{
        unique: true
    })
    email: string;

    @Column('text')
    password: string;

    @Column('text')
    fullName: string;

    @Column('bool', {
        default: true
    })
    isActive: boolean;

    @Column('text',{
        array: true,
        default: ['user'] // Valor por defecto para el campo roles. Esto es opcional, pero se puede agregar una validación adicional para asegurar que los roles sean válidos. Esto podría incluirse en un módu
    })
    roles: string[];
}

