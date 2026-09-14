import { ValidationError } from './Errors';

export interface UserProps {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SanitizedUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export class User {
  private props: UserProps;

  constructor(props: UserProps) {
    this.validateEmail(props.email);
    if (!props.name || props.name.trim().length === 0) {
      throw new ValidationError('User name cannot be empty');
    }
    this.props = {
      ...props,
      email: props.email.toLowerCase().trim(),
      name: props.name.trim(),
    };
  }

  public get id(): string {
    return this.props.id;
  }

  public get email(): string {
    return this.props.email;
  }

  public get passwordHash(): string {
    return this.props.passwordHash;
  }

  public get name(): string {
    return this.props.name;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }

  public updateProfile(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new ValidationError('User name cannot be empty');
    }
    this.props.name = name.trim();
    this.props.updatedAt = new Date();
  }

  public toSanitized(): SanitizedUser {
    return {
      id: this.props.id,
      email: this.props.email,
      name: this.props.name,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }

  private validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      throw new ValidationError('Invalid email address format');
    }
  }
}
