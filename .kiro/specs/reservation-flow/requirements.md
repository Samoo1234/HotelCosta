# Requisitos para Melhoria do Fluxo de Reservas

## Introdução

O sistema de gestão hoteleira atual possui um fluxo de reservas que, embora funcional, apresenta inconsistências e pontos de confusão para os usuários. Este documento define os requisitos para melhorar o fluxo de reservas, tornando-o mais intuitivo e coerente, sem alterar significativamente o layout existente.

## Requisitos

### Requisito 1

**User Story:** Como recepcionista do hotel, quero um fluxo de reservas claro e consistente, para que eu possa gerenciar todo o ciclo de vida de uma reserva sem confusão.

#### Acceptance Criteria
1. QUANDO eu visualizar uma reserva ENTÃO o sistema DEVE mostrar claramente o status atual da reserva (confirmada, check-in, check-out, cancelada)
2. QUANDO eu visualizar uma reserva ENTÃO o sistema DEVE mostrar quais são as próximas ações possíveis baseadas no status atual
3. QUANDO eu mudar o status de uma reserva ENTÃO o sistema DEVE validar se a mudança é coerente com o fluxo lógico (ex: não permitir check-out sem check-in prévio)
4. QUANDO eu visualizar a lista de reservas ENTÃO o sistema DEVE usar cores e ícones consistentes para cada status

### Requisito 2

**User Story:** Como recepcionista, quero realizar o processo de check-in de forma guiada, para garantir que todas as etapas necessárias sejam concluídas corretamente.

#### Acceptance Criteria
1. QUANDO eu selecionar "Realizar Check-in" em uma reserva confirmada ENTÃO o sistema DEVE apresentar um processo guiado com etapas claras
2. QUANDO eu estiver realizando o check-in ENTÃO o sistema DEVE solicitar confirmação dos dados do hóspede
3. QUANDO eu concluir o check-in ENTÃO o sistema DEVE atualizar automaticamente o status da reserva para "checked_in"
4. QUANDO eu concluir o check-in ENTÃO o sistema DEVE mostrar uma confirmação clara de sucesso

### Requisito 3

**User Story:** Como recepcionista, quero realizar o processo de check-out de forma consolidada, para garantir que todos os pagamentos e consumos sejam processados corretamente.

#### Acceptance Criteria
1. QUANDO eu selecionar "Realizar Check-out" em uma reserva com check-in ENTÃO o sistema DEVE apresentar um resumo completo da estadia
2. QUANDO eu estiver realizando o check-out ENTÃO o sistema DEVE mostrar todos os consumos pendentes
3. QUANDO houver consumos pendentes ENTÃO o sistema DEVE permitir finalizar o faturamento antes de concluir o check-out
4. QUANDO eu concluir o check-out ENTÃO o sistema DEVE registrar o pagamento e atualizar o status da reserva para "checked_out"

### Requisito 4

**User Story:** Como gerente do hotel, quero que o sistema forneça feedback claro sobre o estado atual de cada reserva, para facilitar o monitoramento e a gestão.

#### Acceptance Criteria
1. QUANDO uma reserva tiver consumos pendentes ENTÃO o sistema DEVE mostrar um indicador visual claro
2. QUANDO uma reserva estiver próxima da data de check-out ENTÃO o sistema DEVE destacá-la na lista
3. QUANDO uma ação importante for concluída (check-in, faturamento, check-out) ENTÃO o sistema DEVE mostrar uma notificação de sucesso
4. QUANDO houver um erro ou impedimento ENTÃO o sistema DEVE mostrar uma mensagem clara explicando o problema e possíveis soluções

### Requisito 5

**User Story:** Como recepcionista, quero poder gerenciar os consumos de uma reserva de forma integrada ao processo de check-out, para garantir que todos os itens sejam cobrados corretamente.

#### Acceptance Criteria
1. QUANDO eu visualizar os detalhes de uma reserva ENTÃO o sistema DEVE mostrar claramente os consumos associados
2. QUANDO eu adicionar um novo consumo ENTÃO o sistema DEVE atualizá-lo imediatamente na conta da reserva
3. QUANDO eu iniciar o check-out ENTÃO o sistema DEVE verificar se há consumos pendentes e alertar
4. QUANDO eu finalizar o faturamento dos consumos ENTÃO o sistema DEVE incluí-los automaticamente no valor total da reserva