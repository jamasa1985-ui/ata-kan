'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

type HeaderProps = {
    title: string;
    hasBackLink?: boolean;
    backLinkHref?: string;
    leftContent?: ReactNode;
    backLinkText?: string;
    rightContent?: ReactNode;
    maxWidth?: string | number;
    backgroundColor?: string;
    color?: string;
};

export default function Header({
    title,
    leftContent,
    hasBackLink = true,
    backLinkHref = "/",
    backLinkText = "TOPへ戻る",
    rightContent,
    maxWidth = '480px',
    backgroundColor = '#1e90ff',
    color = '#fff'
}: HeaderProps) {
    const renderLeft = () => {
        if (leftContent) return leftContent;
        if (hasBackLink) {
            return (
                <Link href={backLinkHref} style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: '#fff',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    textDecoration: 'none',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    {backLinkText}
                </Link>
            );
        }
        return null;
    };

    return (
        <header
            style={{
                position: 'fixed',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '100%',
                maxWidth: maxWidth,
                padding: '12px 16px',
                backgroundColor: backgroundColor,
                color: color,
                borderRadius: '0 0 10px 10px',
                zIndex: 100,
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                alignItems: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                height: '56px',
                boxSizing: 'border-box',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                {renderLeft()}
            </div>

            <div style={{ fontSize: '18px', fontWeight: 'bold', lineHeight: 1.3, textAlign: 'center', whiteSpace: 'nowrap' }}>
                {title}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                {rightContent}
            </div>
        </header>
    );
}
