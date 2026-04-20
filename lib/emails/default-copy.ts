import type { EmailTemplateType } from "@/lib/wavon/types";

export function defaultEmailSubject(type: EmailTemplateType): string {
  switch (type) {
    case "confirmation":
      return `Votre rendez-vous chez {{business_name}}`;
    case "reminder":
      return `Rappel : {{service_name}} le {{reservation_date}}`;
    case "cancellation":
      return `Votre rendez-vous chez {{business_name}} a été annulé`;
    default:
      return "";
  }
}

export function defaultEmailBody(type: EmailTemplateType): string {
  switch (type) {
    case "confirmation":
      return (
        "Bonjour {{client_name}},\n\n" +
        "Votre rendez-vous pour {{service_name}} est prévu le {{reservation_date}} à {{reservation_time}}.\n\n" +
        "{{business_name}}\n" +
        "{{business_phone}}\n" +
        "{{business_address}}"
      );
    case "reminder":
      return (
        "Bonjour {{client_name}},\n\n" +
        "Petit rappel : {{service_name}} le {{reservation_date}} à {{reservation_time}}.\n\n" +
        "À bientôt,\n{{business_name}}"
      );
    case "cancellation":
      return (
        "Bonjour {{client_name}},\n\n" +
        "Votre rendez-vous du {{reservation_date}} à {{reservation_time}} ({{service_name}}) chez {{business_name}} a été annulé.\n\n" +
        "Pour toute question : {{business_phone}}."
      );
    default:
      return "";
  }
}
