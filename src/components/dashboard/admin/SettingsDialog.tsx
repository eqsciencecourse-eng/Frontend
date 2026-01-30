import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Globe, Settings } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';

export default function SettingsDialog() {
    const { theme, toggleTheme } = useTheme();
    const { language, setLanguage, t } = useLanguage();

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-none">
                    <Settings className="h-5 w-5" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t('admin.system_settings')}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="flex items-center justify-between p-4 rounded-none border dark:border-slate-700 bg-slate-50">
                        <div className="flex items-center gap-3">
                            <Globe className="h-5 w-5 text-indigo-600" />
                            <div>
                                <p className="font-bold text-slate-800">{t('admin.language')}</p>
                                <p className="text-xs text-slate-500">{t('admin.language_desc')}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant={language === 'th' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setLanguage('th' as any)}
                                className={language === 'th' ? 'bg-indigo-600 text-white shadow-md rounded-none' : 'text-slate-600 rounded-none'}
                            >
                                ไทย
                            </Button>
                            <Button
                                variant={language === 'en' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setLanguage('en' as any)}
                                className={language === 'en' ? 'bg-indigo-600 text-white shadow-md rounded-none' : 'text-slate-600 rounded-none'}
                            >
                                English
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
