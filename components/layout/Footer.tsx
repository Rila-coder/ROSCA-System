import Link from 'next/link';
import Image from 'next/image';
import { 
  Facebook, Twitter, Linkedin, Instagram, 
  Mail, Phone, MapPin 
} from 'lucide-react';

const comingSoonPath = "/public-invite/relocat";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-primary text-white mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Company Info */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center space-x-2">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center overflow-hidden p-0">
              <Image
                src="/Images/rosca_logo.png"
                alt="ROSCA Logo"
                width={60}
                height={60}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-xl font-bold text-white sm:block">
              ROSCA
            </span>
          </Link>
            <p className="text-white/80 text-sm">
              A modern platform for managing rotating savings groups with trust, 
              transparency, and community empowerment.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="hover:text-secondary transition-colors">
                <Facebook size={20} />
              </a>
              <a href="#" className="hover:text-secondary transition-colors">
                <Twitter size={20} />
              </a>
              <a href="#" className="hover:text-secondary transition-colors">
                <Linkedin size={20} />
              </a>
              <a href="#" className="hover:text-secondary transition-colors">
                <Instagram size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href={`${comingSoonPath}?title=How It Works`} className="text-white/80 hover:text-secondary transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href={`${comingSoonPath}?title=Features`} className="text-white/80 hover:text-secondary transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href={`${comingSoonPath}?title=Pricing`} className="text-white/80 hover:text-secondary transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href={`${comingSoonPath}?title=Blog`} className="text-white/80 hover:text-secondary transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href={`${comingSoonPath}?title=FAQ`} className="text-white/80 hover:text-secondary transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link href={`${comingSoonPath}?title=Privacy Policy`} className="text-white/80 hover:text-secondary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href={`${comingSoonPath}?title=Terms of Service`} className="text-white/80 hover:text-secondary transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href={`${comingSoonPath}?title=Cookie Policy`} className="text-white/80 hover:text-secondary transition-colors">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link href={`${comingSoonPath}?title=Security`} className="text-white/80 hover:text-secondary transition-colors">
                  Security
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-center space-x-3">
                <Mail size={18} className="text-secondary" />
                <span className="text-white/80">support@roasca.com</span>
              </li>
              <li className="flex items-center space-x-3">
                <Phone size={18} className="text-secondary" />
                <span className="text-white/80">+1 (555) 123-4567</span>
              </li>
              <li className="flex items-start space-x-3">
                <MapPin size={18} className="text-secondary mt-1" />
                <span className="text-white/80">
                  123 Finance Street<br />
                  San Francisco, CA 94107
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/20 my-8"></div>

        {/* Copyright */}
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-white/60 text-sm">
            © {currentYear} ROSCA System. All rights reserved.
          </p>
          <p className="text-white/60 text-sm mt-2 md:mt-0">
            Built with ❤️ for community finance
          </p>
        </div>
      </div>
    </footer>
  );
}