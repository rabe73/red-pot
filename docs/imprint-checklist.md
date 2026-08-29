# What the imprint needs before publishing

Not legal advice — a working list. Have a lawyer look at the finished page if
anything below is not obvious for your situation.

## Do you need one at all?

**Yes.** § 5 DDG (the Digitale-Dienste-Gesetz, which replaced § 5 TMG in May
2024) requires an imprint for *geschäftsmäßige* digital services. A site
advertising a paid subscription app is commercial, whatever its size. Only
genuinely private, non-commercial pages are exempt.

## Required fields, for a sole trader without a company

| Field | Note |
|---|---|
| Given name and surname | The real one. Not "Red Pot" alone — a brand is not a provider. |
| Full postal address | Street, number, postcode, town, country. A P.O. box is **not** enough; it has to be an address at which legal documents can be served. |
| Email address | Must be real and read. |
| A second, direct channel | Historically a phone number. See the note below. |
| VAT ID (§ 27a UStG) | **Only if you have one.** If not, the section is omitted entirely — do not substitute your Steuernummer, which does not belong in an imprint. |

Not needed here: register court and number (no company), supervisory authority
(no regulated profession), a responsible person under § 18 (2) MStV (no
journalistic content).

## The phone number question

§ 5 DDG asks for details enabling "schnelle elektronische Kontaktaufnahme und
unmittelbare Kommunikation". German practice has long read that as email **plus
a telephone number**. The ECJ (C-649/17, Amazon) held that a phone line is not
strictly mandatory if an equally immediate alternative exists — but German courts
have not made that a safe harbour, and a missing number is a favourite of
Abmahnung letters.

**Recommendation: give a number.** If that is unwelcome, the usual answer is a
separate number for the purpose rather than omitting it.

## It becomes public either way

Worth knowing before deciding how private to be: Apple requires developers
distributing in the EU to verify as a **trader** under the Digital Services Act,
and shows the trader's name, address, phone number and email **on the App Store
listing itself**. The same data is therefore public through the App Store
regardless of what the website says. Withholding it from the imprint buys
nothing.

## Do not add the ODR link

Templates still carry a mandatory link to the EU's online dispute resolution
platform at `ec.europa.eu/consumers/odr`. **That platform was shut down on
20 July 2025** and the obligation went with it. A link to a dead EU page is
worse than no link. Verify the current position before publishing — this is
recent enough that half the templates on the web are wrong.

The § 36 VSBG statement about consumer arbitration only obliges businesses with
more than ten employees. The short sentence already on the page is harmless and
can stay or go.

## The same data is needed twice

The privacy policy must name the **controller** under Art. 13 GDPR — that is the
same name and address. Fill both pages in one pass.

## What to send

```
Name:            Vor- und Nachname
Anschrift:       Straße Hausnummer / PLZ Ort / Land
E-Mail:          die Adresse, die im Impressum stehen soll
Telefon:         +49 …            (oder: bewusst weggelassen)
USt-IdNr.:       DE…              (oder: keine vorhanden)
Rechtsform:      Einzelunternehmer / GbR / UG / GmbH
```

Do **not** send an Apple ID, an app-specific password, or any API key. None of
those belong in a repository, and none are needed for an imprint.
